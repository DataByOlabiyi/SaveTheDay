import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { sanitizeText } from '@/lib/utils/sanitize'

// ──────────────────────────────────────────────────────────────
// Validation schema
// ──────────────────────────────────────────────────────────────
const rsvpRequestSchema = z.object({
  weddingId: z.string().uuid(),
  guestId: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(7).max(20).optional().or(z.literal('')),
  status: z.enum(['attending', 'declined']),
  party_size: z.number().min(1).max(20).default(1),
  dietary: z.string().max(200).optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal('')),
})

// ──────────────────────────────────────────────────────────────
// POST /api/rsvp
// ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Rate limiting — 10 RSVPs per minute per IP
  const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = checkRateLimit({ key: `rsvp:${ip}`, limit: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.' },
      { status: 429 }
    )
  }

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Validate
  const parsed = rsvpRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const data = parsed.data
  const supabase = createAdminClient()

  const partySize = data.party_size
  const plusOne   = partySize > 1

  // Sanitize free-text fields
  const safeName    = sanitizeText(data.name)
  const safeDietary = data.dietary ? sanitizeText(data.dietary) : null
  const safeNote    = data.note    ? sanitizeText(data.note)    : null

  // If we have a guestId, update that guest's record
  if (data.guestId) {
    const { error } = await supabase
      .from('guests')
      .update({
        rsvp_status: data.status,
        rsvp_at:     new Date().toISOString(),
        email:       data.email    || null,
        phone:       data.phone    || null,
        party_size:  partySize,
        plus_one:    plusOne,
        dietary:     safeDietary,
        rsvp_note:   safeNote,
      })
      .eq('id', data.guestId)
      .eq('wedding_id', data.weddingId)

    if (error) {
      console.error('RSVP update error:', error)
      return NextResponse.json({ error: 'Failed to save RSVP' }, { status: 500 })
    }
  } else {
    // Anonymous RSVP — create a new guest record
    const { error } = await supabase.from('guests').insert({
      wedding_id:  data.weddingId,
      name:        safeName,
      slug:        `anon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email:       data.email || null,
      phone:       data.phone || null,
      party_size:  partySize,
      plus_one:    plusOne,
      dietary:     safeDietary,
      rsvp_status: data.status,
      rsvp_at:     new Date().toISOString(),
      rsvp_note:   safeNote,
    })

    if (error) {
      console.error('Anonymous RSVP insert error:', error)
      return NextResponse.json({ error: 'Failed to save RSVP' }, { status: 500 })
    }
  }

  // Log analytics event
  await supabase.from('analytics_events').insert({
    wedding_id: data.weddingId,
    guest_id: data.guestId ?? null,
    event_type: 'rsvp_submitted',
    metadata: { status: data.status },
  })

  return NextResponse.json({ success: true })
}
