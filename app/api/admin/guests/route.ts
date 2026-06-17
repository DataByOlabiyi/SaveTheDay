import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/slugify'

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

  let body: { weddingId?: string; guestId?: string; action?: string; value?: boolean | null }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { weddingId, guestId, action, value } = body
  if (!weddingId) return NextResponse.json({ error: 'weddingId is required' }, { status: 400 })
  if (!guestId)   return NextResponse.json({ error: 'guestId is required' }, { status: 400 })
  if (!action)    return NextResponse.json({ error: 'action is required' }, { status: 400 })

  const isOwner = await verifyOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()

  if (action === 'block' || action === 'unblock') {
    const { error } = await db
      .from('guests')
      .update({ is_blocked: action === 'block' })
      .eq('id', guestId)
      .eq('wedding_id', weddingId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, newSlug })
  }

  if (action === 'set-plus-one') {
    // value: true = always allow, false = always deny, null = inherit from wedding config
    const { error } = await db
      .from('guests')
      .update({ allow_plus_one: value ?? null })
      .eq('id', guestId)
      .eq('wedding_id', weddingId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, allow_plus_one: value ?? null })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// POST /api/admin/guests — add a single guest
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, string>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { weddingId, name, email, phone } = body
  if (!weddingId) return NextResponse.json({ error: 'weddingId is required' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const isOwner = await verifyOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()

  const { data: existingGuests } = await db
    .from('guests')
    .select('slug')
    .eq('wedding_id', weddingId)

  const usedSlugs = new Set((existingGuests ?? []).map((g: { slug: string }) => g.slug))
  const baseSlug = slugify(name.trim())
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
      name: name.trim(),
      slug,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ guest: data }, { status: 201 })
}
