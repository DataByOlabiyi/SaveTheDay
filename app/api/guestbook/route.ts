import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase, createAdminClient } from '@/lib/db/client'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'
import { sanitizeText, clampString } from '@/lib/utils/sanitize'

// ──────────────────────────────────────────────────────────────
// GET /api/guestbook?weddingId=...
// Returns the 50 most recent entries for a wedding
// ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const weddingId = request.nextUrl.searchParams.get('weddingId')
  if (!weddingId) {
    return NextResponse.json({ error: 'weddingId is required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('guestbook')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ entries: data ?? [] })
  } catch (err) {
    console.error('Guestbook GET error:', err)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/guestbook
// Submit a new guestbook message
// ──────────────────────────────────────────────────────────────
const submitSchema = z.object({
  weddingId: z.string().uuid(),
  guestId:   z.string().uuid().optional(),
  guestName: z.string().min(1).max(100),
  message:   z.string().min(1).max(500),
})

export async function POST(request: NextRequest): Promise<Response> {
  // Rate-limit 1: max 5 guestbook posts per minute per IP
  const ip  = request.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `guestbook:ip:${ip}`, limit: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { weddingId, guestId, guestName, message } = parsed.data

  // Rate-limit 2: max 30 guestbook posts per hour per wedding
  // Prevents targeted spam against a specific couple's wedding
  const rl2 = await checkRateLimitAsync({ key: `guestbook:wedding:${weddingId}`, limit: 30, windowMs: 60 * 60_000 })
  if (!rl2.allowed) {
    return NextResponse.json({ error: 'Too many messages for this wedding' }, { status: 429 })
  }

  // Sanitize all text inputs
  const safeName    = sanitizeText(clampString(guestName, 100))
  const safeMessage = sanitizeText(clampString(message, 500))

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('guestbook')
      .insert({
        wedding_id: weddingId,
        guest_id:   guestId ?? null,
        guest_name: safeName,
        message:    safeMessage,
        reactions:  {},
      })
      .select()
      .single()

    if (error) throw error

    // Analytics — fire and forget
    supabase.from('analytics_events').insert({
      wedding_id: weddingId,
      guest_id:   guestId ?? null,
      event_type: 'guestbook_written',
    }).then(() => {})

    return NextResponse.json({ entry: data })
  } catch (err) {
    console.error('Guestbook POST error:', err)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }
}
