import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/slugify'

interface GuestRow {
  name: string
  email?: string
  phone?: string
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { weddingId: string; guests: GuestRow[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { weddingId, guests } = body
  if (!weddingId) return NextResponse.json({ error: 'weddingId is required' }, { status: 400 })
  if (!Array.isArray(guests) || guests.length === 0) {
    return NextResponse.json({ error: 'guests array is required' }, { status: 400 })
  }

  const db = createAdminClient()

  // Verify ownership
  const { data: wedding } = await db
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!wedding) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Fetch existing slugs in one query
  const { data: existing } = await db
    .from('guests')
    .select('slug')
    .eq('wedding_id', weddingId)

  const usedSlugs = new Set((existing ?? []).map((g: { slug: string }) => g.slug))

  // Build the full insert payload in memory (no per-row round trips)
  const toInsert: {
    wedding_id: string
    name: string
    slug: string
    email: string | null
    phone: string | null
  }[] = []
  let skipped = 0

  for (const row of guests) {
    if (!row.name?.trim()) { skipped++; continue }

    const baseSlug = slugify(row.name.trim())
    let slug = baseSlug
    let attempt = 0
    while (usedSlugs.has(slug)) {
      attempt++
      slug = `${baseSlug}-${attempt + 1}`
    }
    usedSlugs.add(slug)

    toInsert.push({
      wedding_id: weddingId,
      name:       row.name.trim(),
      slug,
      email:      row.email?.trim() || null,
      phone:      row.phone?.trim() || null,
    })
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ created: 0, skipped, errors: [] })
  }

  // Single bulk insert with conflict handling
  const { data: inserted, error } = await db
    .from('guests')
    .insert(toInsert)
    .select('id')

  if (error) {
    // If there is a conflict on (wedding_id, slug) from a race condition,
    // fall back to individual inserts so we can count skips vs errors.
    if (error.code === '23505') {
      let created = 0
      const errors: string[] = []
      for (const row of toInsert) {
        const { error: rowErr } = await db.from('guests').insert(row)
        if (rowErr) {
          if (rowErr.code === '23505') skipped++
          else errors.push(`${row.name}: ${rowErr.message}`)
        } else {
          created++
        }
      }
      return NextResponse.json({ created, skipped, errors })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    created: inserted?.length ?? toInsert.length,
    skipped,
    errors: [],
  })
}
