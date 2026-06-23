import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/slugify'
import { sanitizeText } from '@/lib/utils/sanitize'

const addGuestSchema = z.object({
  weddingId: z.string().uuid(),
  name:      z.string().min(1).max(100),
  email:     z.string().email().optional().or(z.literal('')),
  phone:     z.string().max(30).optional().or(z.literal('')),
})

const patchGuestSchema = z.object({
  weddingId: z.string().uuid(),
  guestId:   z.string().uuid(),
  action:    z.enum(['block', 'unblock', 'regenerate-link', 'set-plus-one']),
  value:     z.boolean().nullable().optional(),
})

async function verifyOwnership(userId: string, weddingId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('user_id', userId)
    .single()
  return !!data
}

// GET /api/admin/guests?weddingId=...
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weddingId = req.nextUrl.searchParams.get('weddingId') ?? ''
  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })

  const isOwner = await verifyOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('guests')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ guests: data })
}

// DELETE /api/admin/guests?weddingId=...&guestId=...
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weddingId = req.nextUrl.searchParams.get('weddingId') ?? ''
  const guestId   = req.nextUrl.searchParams.get('guestId') ?? ''
  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })
  if (!guestId)   return NextResponse.json({ error: 'guestId required' }, { status: 400 })

  const isOwner = await verifyOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()
  const { error } = await db
    .from('guests')
    .delete()
    .eq('id', guestId)
    .eq('wedding_id', weddingId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/admin/guests — block/unblock, regenerate link, set per-guest plus-one
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let rawBody: unknown
  try { rawBody = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = patchGuestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, guestId, action, value } = parsed.data

  const isOwner = await verifyOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()

  if (action === 'block' || action === 'unblock') {
    const { error } = await db
      .from('guests')
      .update({ is_blocked: action === 'block' })
      .eq('id', guestId)
      .eq('wedding_id', weddingId)

    if (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, is_blocked: action === 'block' })
  }

  if (action === 'regenerate-link') {
    // Fetch existing slugs and the guest's name in parallel
    const [{ data: existing }, { data: thisGuest }] = await Promise.all([
      db.from('guests').select('slug').eq('wedding_id', weddingId),
      db.from('guests').select('name').eq('id', guestId).single(),
    ])

    if (!thisGuest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 })

    const usedSlugs = new Set((existing ?? []).map((g: { slug: string }) => g.slug))
    const baseSlug = slugify(thisGuest.name)
    // Always use a timestamp suffix so the previous link is immediately dead
    let newSlug = `${baseSlug}-${Date.now().toString(36)}`
    let attempt = 0
    while (usedSlugs.has(newSlug)) {
      newSlug = `${baseSlug}-${Date.now().toString(36)}-${++attempt}`
    }

    const { error } = await db
      .from('guests')
      .update({ slug: newSlug })
      .eq('id', guestId)
      .eq('wedding_id', weddingId)

    if (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, newSlug })
  }

  if (action === 'set-plus-one') {
    // value: true = always allow, false = always deny, null = inherit from wedding config
    const { error } = await db
      .from('guests')
      .update({ allow_plus_one: value ?? null })
      .eq('id', guestId)
      .eq('wedding_id', weddingId)

    if (error) {
      Sentry.captureException(error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, allow_plus_one: value ?? null })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// POST /api/admin/guests — add a single guest
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let rawBody: unknown
  try { rawBody = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = addGuestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, name, email, phone } = parsed.data
  const safeName = sanitizeText(name.trim())

  const isOwner = await verifyOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()

  const { data: existingGuests } = await db
    .from('guests')
    .select('slug')
    .eq('wedding_id', weddingId)

  const usedSlugs = new Set((existingGuests ?? []).map((g: { slug: string }) => g.slug))
  const baseSlug = slugify(safeName)
  let slug = baseSlug
  let attempt = 0
  while (usedSlugs.has(slug)) {
    attempt++
    slug = `${baseSlug}-${attempt + 1}`
  }

  const { data, error } = await db
    .from('guests')
    .insert({
      wedding_id: weddingId,
      name: safeName,
      slug,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ guest: data }, { status: 201 })
}

// PUT /api/admin/guests — edit a guest's name, email, or phone
const editGuestSchema = z.object({
  weddingId: z.string().uuid(),
  guestId:   z.string().uuid(),
  name:      z.string().min(1).max(100),
  email:     z.string().email().optional().or(z.literal('')),
  phone:     z.string().max(30).optional().or(z.literal('')),
})

export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = editGuestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, guestId, name, email, phone } = parsed.data

  const isOwner = await verifyOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('guests')
    .update({
      name:  sanitizeText(name.trim()),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
    })
    .eq('id', guestId)
    .eq('wedding_id', weddingId)
    .select()
    .single()

  if (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ guest: data })
}
