import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const BUCKET = 'wedding-gallery'

const schema = z.object({
  weddingId: z.string().uuid(),
})

function ogCoverPath(weddingId: string): string {
  return `${weddingId}/og-cover.jpg`
}

// POST /api/og-image
// Returns a one-time signed upload URL for the wedding's share-preview photo.
// upsert:true lets a re-upload overwrite the previous cover at the same path.
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `og-image:${ip}`, limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 422 })
  }

  const { weddingId } = parsed.data

  const db = createAdminClient()

  const { data: wedding } = await db
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!wedding) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const path = ogCoverPath(weddingId)

  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true })

  if (error || !data) {
    Sentry.captureException(error ?? new Error('createSignedUploadUrl returned no data'))
    return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 })
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl })
}

// DELETE /api/og-image
// Removes the stored cover photo and clears config.og_image_url.
export async function DELETE(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `og-image:${ip}`, limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 422 })
  }

  const { weddingId } = parsed.data

  try {
    const db = createAdminClient()

    const { data: current, error: fetchError } = await db
      .from('weddings')
      .select('slug, config, user_id')
      .eq('id', weddingId)
      .single()

    if (fetchError || !current) return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
    if (current.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Swallow storage errors (including not-found, e.g. a repeated remove click) —
    // the config update below is what actually matters to the couple.
    await db.storage.from(BUCKET).remove([ogCoverPath(weddingId)])

    const config = { ...(current.config as Record<string, unknown>) }
    delete config.og_image_url

    const { data: wedding, error: updateError } = await db
      .from('weddings')
      .update({ config })
      .eq('id', weddingId)
      .select()
      .single()

    if (updateError) throw updateError

    revalidatePath(`/e/${wedding.slug}`, 'layout')

    delete (wedding.config as Record<string, unknown>).privacy_password_hash

    return NextResponse.json({ wedding })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to remove photo' }, { status: 500 })
  }
}
