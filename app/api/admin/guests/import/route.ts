import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils/slugify'
import { sanitizeText } from '@/lib/utils/sanitize'

const guestRowSchema = z.object({
  name:  z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
})

const importBodySchema = z.object({
  weddingId: z.string().uuid(),
  guests:    z.array(guestRowSchema).min(1).max(500),
})

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let rawBody: unknown
  try { rawBody = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = importBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, guests } = parsed.data

  const db = createAdminClient()

  // BILLING ENFORCEMENT GOES HERE (currently free during launch)
  // When billing goes live:
  //   1. Fetch subscription tier for user.id
  //   2. Fetch max_guests from tier_limits for that tier (-1 = unlimited)
  //   3. Count existing guests for weddingId
  //   4. If count + guests.length > max_guests return 403 with upgrade prompt

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

    const safeName = sanitizeText(row.name.trim())
    const baseSlug = slugify(safeName)
    let slug = baseSlug
    let attempt = 0
    while (usedSlugs.has(slug)) {
      attempt++
      slug = `${baseSlug}-${attempt + 1}`
    }
    usedSlugs.add(slug)

    toInsert.push({
      wedding_id: weddingId,
      name:       safeName,
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
          else {
            Sentry.captureException(rowErr)
            errors.push(`${row.name}: ${rowErr.message}`)
          }
        } else {
          created++
        }
      }
      return NextResponse.json({ created, skipped, errors })
    }
    Sentry.captureException(error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }

  return NextResponse.json({
    created: inserted?.length ?? toInsert.length,
    skipped,
    errors: [],
  })
}
