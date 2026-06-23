import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const schema = z.object({
  photoId:   z.string().uuid(),
  weddingId: z.string().uuid(),
  guestId:   z.string().uuid().optional(),
})

// POST /api/gallery/download — increment download counter
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `gallery-dl:${ip}`, limit: 30, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 422 })

  const { photoId, weddingId, guestId } = parsed.data

  try {
    const supabase = createAdminClient()

    // Only track downloads for published weddings — prevents counter inflation
    const { data: wedding } = await supabase
      .from('weddings')
      .select('status')
      .eq('id', weddingId)
      .single()

    if (!wedding || wedding.status !== 'published') {
      return NextResponse.json({ success: true }) // Silent
    }

    // Increment download counter
    await supabase.rpc('increment_download_count', { photo_id: photoId })

    // Log analytics event (fire and forget)
    supabase.from('analytics_events').insert({
      wedding_id: weddingId,
      guest_id:   guestId ?? null,
      event_type: 'photo_downloaded',
      metadata:   { photo_id: photoId },
    }).then(() => {})

    return NextResponse.json({ success: true })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to track download' }, { status: 500 })
  }
}
