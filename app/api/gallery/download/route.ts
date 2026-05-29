import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimit } from '@/lib/utils/rateLimit'

const schema = z.object({
  photoId:   z.string().uuid(),
  weddingId: z.string().uuid(),
  guestId:   z.string().uuid().optional(),
})

// POST /api/gallery/download — increment download counter
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  // Allow 30 downloads per minute per IP
  const rl  = checkRateLimit({ key: `gallery-dl:${ip}`, limit: 30, windowMs: 60_000 })
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
    console.error('Download POST error:', err)
    return NextResponse.json({ error: 'Failed to track download' }, { status: 500 })
  }
}
