import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { sanitizeText, clampString, isSingleEmoji, isSafeUrl } from '@/lib/utils/sanitize'

// Verify the authenticated user owns the given wedding
async function assertOwnership(userId: string, weddingId: string): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('user_id', userId)
    .single()
  return !!data
}

// ── GET /api/story?weddingId=... ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const weddingId = req.nextUrl.searchParams.get('weddingId')
  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })

  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('story_milestones')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })

    if (error) {
      if ((error as { code?: string }).code === 'PGRST205' ||
          (error as { code?: string }).code === 'PGRST200') {
        return NextResponse.json({ milestones: [] })
      }
      throw error
    }
    return NextResponse.json({ milestones: data ?? [] })
  } catch (err) {
    console.error('Story GET error:', err)
    return NextResponse.json({ milestones: [] })
  }
}

// ── POST /api/story — create or update a milestone ───────────────────────────
const milestoneSchema = z.object({
  weddingId:   z.string().uuid(),
  id:          z.string().uuid().optional(),
  title:       z.string().min(1).max(100),
  date_label:  z.string().max(50).nullish(),
  description: z.string().max(1000).nullish(),
  emoji:       z.string().max(8).nullish(),
  media_urls:  z.array(z.object({
    url:     z.string().url(),
    type:    z.enum(['photo', 'video']),
    caption: z.string().max(200).nullish(),
  })).max(6).nullish(),
  sort_order:  z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = checkRateLimit({ key: `story-write:${ip}`, limit: 30, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = milestoneSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, id, ...fields } = parsed.data

  const isOwner = await assertOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const payload = {
    wedding_id:  weddingId,
    title:       sanitizeText(clampString(fields.title, 100)),
    date_label:  fields.date_label ? sanitizeText(fields.date_label) : null,
    description: fields.description ? sanitizeText(clampString(fields.description, 1000)) : null,
    emoji:       fields.emoji && isSingleEmoji(fields.emoji) ? fields.emoji : null,
    media_urls:  (fields.media_urls ?? []).filter(m => isSafeUrl(m.url)),
    sort_order:  fields.sort_order ?? 0,
  }

  try {
    const db = createAdminClient()

    if (id) {
      const { data, error } = await db
        .from('story_milestones')
        .update(payload)
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ milestone: data })
    } else {
      const { data, error } = await db
        .from('story_milestones')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ milestone: data }, { status: 201 })
    }
  } catch (err) {
    console.error('Story POST error:', err)
    return NextResponse.json({ error: 'Failed to save milestone' }, { status: 500 })
  }
}

// ── PATCH /api/story — bulk reorder milestones ────────────────────────────────
export async function PATCH(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = checkRateLimit({ key: `story-reorder:${ip}`, limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = z.object({
    weddingId: z.string().uuid(),
    orders: z.array(z.object({
      id:         z.string().uuid(),
      sort_order: z.number().int().min(0),
    })).min(1).max(50),
  }).safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 422 })
  }

  const { weddingId, orders } = parsed.data

  const isOwner = await assertOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const db = createAdminClient()
    await Promise.all(
      orders.map(({ id, sort_order }) =>
        db.from('story_milestones')
          .update({ sort_order })
          .eq('id', id)
          .eq('wedding_id', weddingId)
      )
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Story PATCH error:', err)
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
}

// ── DELETE /api/story?id=...&weddingId=... ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id        = req.nextUrl.searchParams.get('id')
  const weddingId = req.nextUrl.searchParams.get('weddingId')

  if (!id || !weddingId) {
    return NextResponse.json({ error: 'id and weddingId required' }, { status: 400 })
  }

  const isOwner = await assertOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const db = createAdminClient()
    const { error } = await db
      .from('story_milestones')
      .delete()
      .eq('id', id)
      .eq('wedding_id', weddingId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Story DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
