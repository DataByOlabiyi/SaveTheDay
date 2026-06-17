import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'
import { sanitizeText } from '@/lib/utils/sanitize'

const rsvpRequestSchema = z.object({
  weddingId:        z.string().uuid(),
  guestId:          z.string().uuid().optional(),
  name:             z.string().min(2).max(100),
  email:            z.string().email().optional().or(z.literal('')),
  phone:            z.string().min(7).max(20).optional().or(z.literal('')),
  status:           z.enum(['attending', 'declined']),
  party_size:       z.number().min(1).max(20).default(1),
  plus_one_name:    z.string().max(100).optional().or(z.literal('')),
  dietary:          z.string().max(200).optional().or(z.literal('')),
  meal_choice:      z.string().max(100).optional().or(z.literal('')),
  attending_events: z.array(z.string().max(100)).max(10).optional(),
  note:             z.string().max(500).optional().or(z.literal('')),
  turnstileToken:   z.string().optional(),
})

export async function POST(request: NextRequest): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `rsvp:${ip}`, limit: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a moment.' },
      { status: 429 }
    )
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = rsvpRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const data = parsed.data

  // Cloudflare Turnstile verification (enforced only when secret key is configured)
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
  if (turnstileSecret) {
    if (!data.turnstileToken) {
      return NextResponse.json({ error: 'Bot verification required' }, { status: 403 })
    }
    const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0'
    const verified = await verifyTurnstile(data.turnstileToken, ip, turnstileSecret)
    if (!verified) {
      return NextResponse.json({ error: 'Bot verification failed. Please try again.' }, { status: 403 })
    }
  }

  const supabase = createAdminClient()

  // Validate the wedding exists, is published, and RSVP is still open
  const { data: wedding, error: weddingError } = await supabase
    .from('weddings')
    .select('id, status, config')
    .eq('id', data.weddingId)
    .single()

  if (weddingError || !wedding) {
    return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
  }
  if (wedding.status !== 'published') {
    return NextResponse.json({ error: 'This wedding is not accepting RSVPs' }, { status: 403 })
  }
  const deadline = (wedding.config as { rsvp_deadline?: string })?.rsvp_deadline
  if (deadline && new Date(deadline) < new Date()) {
    return NextResponse.json({ error: 'RSVP deadline has passed' }, { status: 410 })
  }

  const partySize = data.party_size
  const plusOne   = partySize > 1

  const safeName      = sanitizeText(data.name)
  const safeDietary   = data.dietary     ? sanitizeText(data.dietary)     : null
  const safeNote      = data.note        ? sanitizeText(data.note)        : null
  const safePlusOne   = data.plus_one_name ? sanitizeText(data.plus_one_name) : null
  const safeMeal      = data.meal_choice  ? sanitizeText(data.meal_choice)  : null
  const safeEvents    = data.attending_events?.map(e => sanitizeText(e)) ?? null

  if (data.guestId) {
    // Fetch guest to check block status and per-guest plus-one override
    const { data: guestRecord, error: guestFetchError } = await supabase
      .from('guests')
      .select('is_blocked, allow_plus_one')
      .eq('id', data.guestId)
      .eq('wedding_id', data.weddingId)
      .single()

    if (guestFetchError || !guestRecord) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 })
    }

    if (guestRecord.is_blocked) {
      return NextResponse.json(
        { error: 'This invitation is no longer accepting responses.' },
        { status: 403 }
      )
    }

    // Per-guest plus-one override: null means inherit from wedding config
    const plusOneAllowed = guestRecord.allow_plus_one !== null && guestRecord.allow_plus_one !== undefined
      ? guestRecord.allow_plus_one
      : (wedding.config as { allow_plus_one?: boolean }).allow_plus_one !== false

    if (!plusOneAllowed && partySize > 1) {
      return NextResponse.json(
        { error: 'A plus-one is not permitted for this invitation.' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('guests')
      .update({
        rsvp_status:      data.status,
        rsvp_at:          new Date().toISOString(),
        email:            data.email || null,
        phone:            data.phone || null,
        party_size:       partySize,
        plus_one:         plusOne,
        plus_one_name:    safePlusOne,
        dietary:          safeDietary,
        meal_choice:      safeMeal,
        attending_events: safeEvents,
        rsvp_note:        safeNote,
      })
      .eq('id', data.guestId)
      .eq('wedding_id', data.weddingId)

    if (error) {
      console.error('RSVP update error:', error)
      return NextResponse.json({ error: 'Failed to save RSVP' }, { status: 500 })
    }
  } else {
    const { error } = await supabase.from('guests').insert({
      wedding_id:       data.weddingId,
      name:             safeName,
      slug:             `anon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      email:            data.email || null,
      phone:            data.phone || null,
      party_size:       partySize,
      plus_one:         plusOne,
      plus_one_name:    safePlusOne,
      dietary:          safeDietary,
      meal_choice:      safeMeal,
      attending_events: safeEvents,
      rsvp_status:      data.status,
      rsvp_at:          new Date().toISOString(),
      rsvp_note:        safeNote,
    })

    if (error) {
      console.error('Anonymous RSVP insert error:', error)
      return NextResponse.json({ error: 'Failed to save RSVP' }, { status: 500 })
    }
  }

  // Fire analytics (non-blocking)
  supabase.from('analytics_events').insert({
    wedding_id: data.weddingId,
    guest_id:   data.guestId ?? null,
    event_type: 'rsvp_submitted',
    metadata:   { status: data.status },
  }).then(() => {}, err => console.error('Analytics insert failed:', err))

  // Email notification — fires if RESEND_API_KEY is configured
  // Looks up the couple's email via user_profiles and notifies them
  notifyCouple(data.weddingId, safeName, data.status).catch(
    err => console.error('RSVP notification failed:', err)
  )

  return NextResponse.json({ success: true })
}

async function verifyTurnstile(token: string, ip: string, secret: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    })
    const json = await res.json() as { success: boolean }
    return json.success === true
  } catch (err) {
    console.error('[turnstile] verification error:', err)
    return false
  }
}

async function notifyCouple(
  weddingId: string,
  guestName: string,
  status: 'attending' | 'declined'
) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return // Email not configured — skip silently

  const supabase = createAdminClient()

  // Look up wedding + owner's email in one query
  const { data } = await supabase
    .from('weddings')
    .select('couple_names, user_id, user_profiles!inner(email)')
    .eq('id', weddingId)
    .single() as { data: {
      couple_names: { name1: string; name2: string }
      user_id: string
      user_profiles: { email: string }
    } | null }

  if (!data?.user_profiles?.email) return

  const coupleEmail = data.user_profiles.email
  const coupleName  = `${data.couple_names.name1} & ${data.couple_names.name2}`
  const statusText  = status === 'attending' ? '✓ Attending' : '✗ Declined'

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'notifications@savetheday.app',
      to: coupleEmail,
      subject: `${guestName} just RSVP'd — ${statusText}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #080C0A; color: #FAF7F2;">
          <p style="color: #C9A84C; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;">Save The Day</p>
          <h2 style="font-size: 24px; margin: 16px 0;">${coupleName}</h2>
          <p style="color: #999; line-height: 1.6;">
            <strong style="color: #FAF7F2;">${guestName}</strong> has responded to your invitation.
          </p>
          <div style="margin: 24px 0; padding: 16px; border: 1px solid rgba(201,168,76,0.2); border-radius: 4px; background: rgba(201,168,76,0.05);">
            <p style="margin: 0; color: ${status === 'attending' ? '#4ade80' : '#f87171'}; font-weight: bold;">
              ${statusText}
            </p>
          </div>
          <p style="color: #555; font-size: 12px;">
            View all RSVPs in your <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://savetheday.app'}/studio" style="color: #C9A84C;">Studio</a>.
          </p>
        </div>
      `,
    }),
  })
}
