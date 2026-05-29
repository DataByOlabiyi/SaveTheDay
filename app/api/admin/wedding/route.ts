import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { sanitizeText } from '@/lib/utils/sanitize'

const dressCodeSchema = z.object({
  title:       z.string().max(100),
  description: z.string().max(500).optional(),
  colors: z.array(z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    label: z.string().max(50),
  })).max(12).optional(),
}).optional()

const configSchema = z.object({
  show_countdown:      z.boolean().optional(),
  show_guestbook:      z.boolean().optional(),
  show_story:          z.boolean().optional(),
  show_gallery:        z.boolean().optional(),
  show_schedule:       z.boolean().optional(),
  show_venue_map:      z.boolean().optional(),
  show_gift_registry:  z.boolean().optional(),
  show_post_uploads:   z.boolean().optional(),
  allow_plus_one:      z.boolean().optional(),
  collect_dietary:     z.boolean().optional(),
  allow_downloads:     z.boolean().optional(),
  watermark_downloads: z.boolean().optional(),
  is_private:          z.boolean().optional(),
  google_maps_url:     z.string().url().max(500).optional().nullable(),
  intro_text:          z.string().max(200).optional().nullable(),
  hashtag:             z.string().max(100).optional().nullable(),
  gift_registry_url:   z.string().url().max(500).optional().nullable(),
  gift_registry_note:  z.string().max(200).optional().nullable(),
  rsvp_deadline:       z.string().optional().nullable(),
  dress_code:          dressCodeSchema,
  music_track:         z.string().url().max(500).optional().nullable(),
  music_tracks:        z.array(z.object({
    url:    z.string().url().max(500),
    title:  z.string().max(100),
    artist: z.string().max(100).optional(),
  })).max(20).optional(),
  intro_video_url:     z.string().url().max(500).optional().nullable(),
})

const patchSchema = z.object({
  weddingId:     z.string().uuid(),
  secret:        z.string(),
  venue:         z.string().min(1).max(200).optional(),
  venue_address: z.string().max(300).optional().nullable(),
  city:          z.string().max(100).optional(),
  config:        configSchema.optional(),
})

// PATCH /api/admin/wedding — update wedding details
export async function PATCH(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = checkRateLimit({ key: `wedding-patch:${ip}`, limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, secret, venue, venue_address, city, config } = parsed.data

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Fetch current wedding for config merge
    const { data: current, error: fetchError } = await supabase
      .from('weddings')
      .select('config')
      .eq('id', weddingId)
      .single()

    if (fetchError) throw fetchError

    const updates: Record<string, unknown> = {}
    if (venue)           updates.venue         = sanitizeText(venue)
    if (venue_address !== undefined) updates.venue_address = venue_address ? sanitizeText(venue_address) : null
    if (city)            updates.city          = sanitizeText(city)
    if (config) {
      // Deep merge config
      updates.config = { ...(current?.config ?? {}), ...config }
    }

    const { data: wedding, error: updateError } = await supabase
      .from('weddings')
      .update(updates)
      .eq('id', weddingId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ wedding })
  } catch (err) {
    console.error('Wedding PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update wedding' }, { status: 500 })
  }
}
