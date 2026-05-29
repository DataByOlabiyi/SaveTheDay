import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { sanitizeText, clampString, isSingleEmoji, isSafeUrl } from '@/lib/utils/sanitize'

// ──────────────────────────────────────────────────────────────
// GET /api/story?weddingId=...
// ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const weddingId = req.nextUrl.searchParams.get('weddingId')
  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('story_milestones')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })

    if (error) {
      // PGRST205 = table not yet in schema cache (schema-v2.sql not yet run)
      // Return empty gracefully rather than crashing the page
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

// ──────────────────────────────────────────────────────────────
// POST /api/story  — create or update a milestone (admin)
// ──────────────────────────────────────────────────────────────
const milestoneSchema = z.object({
  weddingId:   z.string().uuid(),
  secret:      z.string(),
  id:          z.string().uuid().optional(),   // present for updates
  title:       z.string().min(1).max(100),
  date_label:  z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  emoji:       z.string().max(8).optional(),
  media_urls:  z.array(z.object({
    url:     z.string().url(),
    type:    z.enum(['photo', 'video']),
    caption: z.string().max(200).optional(),
  })).max(6).optional(),
  sort_order:  z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = checkRateLimit({ key: `story-write:${ip}`, limit: 30, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = milestoneSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, secret, id, ...fields } = parsed.data

  // Verify admin secret
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Sanitize text fields
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
    const supabase = createAdminClient()

    if (id) {
      const { data, error } = await supabase
        .from('story_milestones')
        .update(payload)
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ milestone: data })
    } else {
      const { data, error } = await supabase
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

// ──────────────────────────────────────────────────────────────
// DELETE /api/story?id=...&weddingId=...&secret=...
// ──────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const id         = req.nextUrl.searchParams.get('id')
  const weddingId  = req.nextUrl.searchParams.get('weddingId')
  const secret     = req.nextUrl.searchParams.get('secret')

  if (!id || !weddingId || !secret) {
    return NextResponse.json({ error: 'id, weddingId and secret required' }, { status: 400 })
  }
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
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
