import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const ALLOWED_REACTIONS = ['❤️', '🥂', '✨', '🎊', '🙏', '💐']

const schema = z.object({
  entryId:    z.string().uuid(),
  weddingId:  z.string().uuid(),
  emoji:      z.string().refine(e => ALLOWED_REACTIONS.includes(e), { message: 'Invalid emoji' }),
  action:     z.enum(['add', 'remove']),
  guestId:    z.string().uuid().optional(),
})

// POST /api/guestbook/react — toggle an emoji reaction on a guestbook entry
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `react:${ip}`, limit: 30, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { entryId, weddingId, emoji, action, guestId } = parsed.data

  try {
    const supabase = createAdminClient()

    // Fetch current reactions
    const { data: entry, error: fetchError } = await supabase
      .from('guestbook')
      .select('reactions, wedding_id')
      .eq('id', entryId)
      .single()

    if (fetchError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Security: ensure the entry belongs to the claimed wedding
    if (entry.wedding_id !== weddingId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reactions: Record<string, number> = (entry.reactions as Record<string, number>) ?? {}
    const current = reactions[emoji] ?? 0

    if (action === 'add') {
      reactions[emoji] = current + 1
    } else {
      reactions[emoji] = Math.max(0, current - 1)
      if (reactions[emoji] === 0) delete reactions[emoji]
    }

    const { data: updated, error: updateError } = await supabase
      .from('guestbook')
      .update({ reactions })
      .eq('id', entryId)
      .select('reactions')
      .single()

    if (updateError) throw updateError

    // Analytics (fire and forget)
    if (action === 'add') {
      supabase.from('analytics_events').insert({
        wedding_id: weddingId,
        guest_id:   guestId ?? null,
        event_type: 'reaction_added',
        metadata:   { emoji, entry_id: entryId },
      }).then(() => {})
    }

    return NextResponse.json({ reactions: updated?.reactions ?? reactions })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 })
  }
}
