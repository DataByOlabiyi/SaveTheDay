import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'
import { sanitizeText } from '@/lib/utils/sanitize'
import { hashPassword } from '@/lib/utils/password'

const dressCodeSchema = z.object({
  title:          z.string().max(100),
  description:    z.string().max(500).optional(),
  vendor_name:    z.string().max(200).optional(),
  vendor_contact: z.string().max(100).optional(),
  colors: z.array(z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    label: z.string().max(50),
  })).max(12).optional(),
}).optional()

const accommodationSchema = z.array(z.object({
  name:         z.string().min(1).max(200),
  address:      z.string().min(1).max(300),
  price_range:  z.string().max(100).optional(),
  phone:        z.string().max(50).optional(),
  booking_url:  z.string().max(500).optional(),
})).max(3).optional()

const bankDetailSchema = z.array(z.object({
  bank_name:      z.string().min(1).max(100),
  account_number: z.string().min(1).max(30),
  account_name:   z.string().min(1).max(100),
  label:          z.string().max(50).optional(),
})).max(5).optional()

const configSchema = z.object({
  show_countdown:       z.boolean().optional(),
  show_guestbook:       z.boolean().optional(),
  show_story:           z.boolean().optional(),
  show_gallery:         z.boolean().optional(),
  show_schedule:        z.boolean().optional(),
  show_venue_map:       z.boolean().optional(),
  show_gift_registry:   z.boolean().optional(),
  show_post_uploads:    z.boolean().optional(),
  show_accommodations:  z.boolean().optional(),
  rsvp_open:            z.boolean().optional(),
  allow_plus_one:       z.boolean().optional(),
  collect_dietary:      z.boolean().optional(),
  collect_meal_choice:  z.boolean().optional(),
  allow_downloads:      z.boolean().optional(),
  watermark_downloads:  z.boolean().optional(),
  is_private:           z.boolean().optional(),
  // Plaintext password from client — hashed before storage, never stored as-is
  privacy_password:     z.string().min(4).max(100).optional().nullable(),
  google_maps_url:      z.string().url().max(500).optional().nullable(),
  intro_text:           z.string().max(200).optional().nullable(),
  hashtag:              z.string().max(100).optional().nullable(),
  gift_registry_url:    z.string().url().max(500).optional().nullable(),
  gift_registry_note:   z.string().max(200).optional().nullable(),
  rsvp_deadline:        z.string().optional().nullable(),
  dress_code:           dressCodeSchema,
  accommodations:       accommodationSchema,
  bank_details:         bankDetailSchema,
  meal_options:         z.array(z.string().max(100)).max(10).optional(),
  rsvp_events:          z.array(z.string().max(100)).max(10).optional(),
  music_track:          z.string().url().max(500).optional().nullable(),
  music_tracks:         z.array(z.object({
    url:    z.string().url().max(500),
    title:  z.string().max(100),
    artist: z.string().max(100).optional(),
  })).max(20).optional(),
  intro_video_url:      z.string().url().max(500).optional().nullable(),
  invitation_theme:     z.string().max(50).optional(),
})

const patchSchema = z.object({
  weddingId:     z.string().uuid(),
  slug:          z.string().min(3).max(100).regex(/^[a-z0-9-]+$/).optional(),
  couple_names:  z.object({ name1: z.string().min(1).max(60), name2: z.string().min(1).max(60) }).optional(),
  wedding_date:  z.string().min(1).optional(),
  venue:         z.string().min(1).max(200).optional(),
  venue_address: z.string().max(300).optional().nullable(),
  city:          z.string().max(100).optional(),
  config:        configSchema.optional(),
})

// DELETE /api/admin/wedding?weddingId=...
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weddingId = req.nextUrl.searchParams.get('weddingId')
  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })

  const db = createAdminClient()

  // Verify ownership
  const { data: wedding } = await db
    .from('weddings')
    .select('id, slug, user_id')
    .eq('id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!wedding) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await db.from('weddings').delete().eq('id', weddingId)
  if (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `wedding-patch:${ip}`, limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  // Session auth
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, slug, couple_names, wedding_date, venue, venue_address, city, config } = parsed.data

  try {
    const db = createAdminClient()

    // Verify ownership
    const { data: current, error: fetchError } = await db
      .from('weddings')
      .select('config, user_id')
      .eq('id', weddingId)
      .single()

    if (fetchError || !current) return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
    if (current.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Slug uniqueness check
    if (slug) {
      const { data: existing } = await db
        .from('weddings')
        .select('id')
        .eq('slug', slug)
        .neq('id', weddingId)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'This URL is already taken. Try adding the year, e.g. adaeze-emeka-2026.' },
          { status: 409 }
        )
      }
    }

    const updates: Record<string, unknown> = {}
    if (slug)            updates.slug          = slug
    if (couple_names)    updates.couple_names  = { name1: sanitizeText(couple_names.name1), name2: sanitizeText(couple_names.name2) }
    if (wedding_date)    updates.wedding_date  = wedding_date
    if (venue)           updates.venue         = sanitizeText(venue)
    if (venue_address !== undefined) updates.venue_address = venue_address ? sanitizeText(venue_address) : null
    if (city)            updates.city          = sanitizeText(city)
    if (config) {
      const base = (current.config ?? {}) as Record<string, unknown>
      // Destructure privacy_password so it never reaches the stored config as plaintext
      const { privacy_password, ...restConfig } = config as Record<string, unknown> & { privacy_password?: string | null }
      const patch = restConfig

      // Arrays and primitives are replaced wholesale; plain objects are merged one level deep
      // so that updating e.g. dress_code.title preserves dress_code.colors.
      const merged: Record<string, unknown> = { ...base }
      for (const [k, v] of Object.entries(patch)) {
        if (
          v !== null &&
          typeof v === 'object' &&
          !Array.isArray(v) &&
          typeof base[k] === 'object' &&
          base[k] !== null &&
          !Array.isArray(base[k])
        ) {
          merged[k] = { ...(base[k] as object), ...(v as object) }
        } else {
          merged[k] = v
        }
      }

      // Hash the plaintext password before storing; null clears the password
      if (privacy_password === null) {
        delete merged.privacy_password_hash
      } else if (privacy_password) {
        merged.privacy_password_hash = await hashPassword(privacy_password)
      }

      updates.config = merged
    }

    const { data: wedding, error: updateError } = await db
      .from('weddings')
      .update(updates)
      .eq('id', weddingId)
      .select()
      .single()

    if (updateError) throw updateError

    revalidatePath(`/e/${wedding.slug}`)
    revalidatePath(`/e/${wedding.slug}/gallery`)

    delete (wedding.config as Record<string, unknown>).privacy_password_hash

    return NextResponse.json({ wedding })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to update wedding' }, { status: 500 })
  }
}
