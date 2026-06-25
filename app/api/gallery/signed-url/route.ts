import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const BUCKET = 'wedding-gallery'

const schema = z.object({
  weddingId: z.string().uuid(),
  fileName:  z.string().min(1).max(255),
  albumId:   z.string().uuid().optional(),
})

// POST /api/gallery/signed-url
// Returns a one-time signed upload URL so the browser can PUT directly to
// Supabase Storage without routing the file payload through Vercel.
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `gallery-signed-url:${ip}`, limit: 40, windowMs: 60_000 })
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

  const { weddingId, fileName } = parsed.data

  const db = createAdminClient()

  const { data: wedding } = await db
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!wedding) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ext  = fileName.split('.').pop() ?? 'jpg'
  const path = `${weddingId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`

  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    Sentry.captureException(error ?? new Error('createSignedUploadUrl returned no data'))
    return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 })
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl })
}
