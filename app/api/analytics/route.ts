import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const VALID_EVENT_TYPES = [
  'opened', 'seal_tapped', 'video_watched', 'rsvp_submitted', 'shared',
  'guestbook_written', 'gallery_viewed', 'photo_downloaded', 'story_viewed',
  'reaction_added', 'page_viewed',
] as const

const schema = z.object({
  weddingId: z.string().uuid(),
  guestId:   z.string().uuid().optional(),
  eventType: z.enum(VALID_EVENT_TYPES),
  metadata:  z.record(z.string().max(100), z.string().max(500)).refine(
    m => Object.keys(m).length <= 10,
    { message: 'metadata may not have more than 10 keys' },
  ).optional(),
})

export async function POST(request: NextRequest) {
  // Gentle rate limit — max 120 analytics events per minute per IP
  const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `analytics:${ip}`, limit: 120, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ ok: true }) // Silent — never break client

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: true }) // Silently ignore bad analytics
  }

  const { weddingId, guestId, eventType, metadata } = parsed.data

  try {
    const supabase = createAdminClient()

    // Only accept events for published weddings — prevents pollution of any couple's analytics
    const { data: wedding } = await supabase
      .from('weddings')
      .select('status')
      .eq('id', weddingId)
      .single()

    if (!wedding || wedding.status !== 'published') {
      return NextResponse.json({ ok: true }) // Silent — never break client
    }

    await supabase.from('analytics_events').insert({
      wedding_id: weddingId,
      guest_id: guestId ?? null,
      event_type: eventType,
      metadata: metadata ?? null,
    })
  } catch {
    // Fire and forget
  }

  return NextResponse.json({ ok: true })
}
