import { createAdminClient } from '@/lib/db/client'
import { slugify } from '@/lib/utils/slugify'

interface GuestRow {
  name: string
  email?: string
  phone?: string
}

// ──────────────────────────────────────────────────────────────
// POST /api/admin/guests/import
// Bulk-import guests from a parsed list.
// Body: { secret, weddingId, guests: GuestRow[] }
// Returns: { created, skipped, errors }
// ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return Response.json({ error: 'Invalid request body' }, { status: 400 })

    const { secret, weddingId, guests } = body as {
      secret: string
      weddingId: string
      guests: GuestRow[]
    }

    // ── Auth ────────────────────────────────────────────────────
    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret || secret !== adminSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!weddingId) return Response.json({ error: 'weddingId is required' }, { status: 400 })
    if (!Array.isArray(guests) || guests.length === 0) {
      return Response.json({ error: 'guests array is required' }, { status: 400 })
    }

    console.log(`[import-guests] Importing ${guests.length} rows for wedding ${weddingId}`)

    // ── Admin DB client ─────────────────────────────────────────
    let db: ReturnType<typeof createAdminClient>
    try {
      db = createAdminClient()
    } catch (e) {
      console.error('[import-guests] createAdminClient failed:', e)
      return Response.json({ error: 'Server config error — SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })
    }

    // ── Fetch existing slugs once ───────────────────────────────
    const { data: existing, error: fetchError } = await db
      .from('guests')
      .select('slug')
      .eq('wedding_id', weddingId)

    if (fetchError) {
      console.error('[import-guests] fetch error:', fetchError.message)
    }

    const usedSlugs = new Set((existing ?? []).map((g: { slug: string }) => g.slug))

    let created = 0
    let skipped = 0
    const errors: string[] = []

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

      const { error } = await db.from('guests').insert({
        wedding_id: weddingId,
        name: row.name.trim(),
        slug,
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
      })

      if (error) {
        console.error(`[import-guests] insert error for "${row.name}":`, error.message)
        if (error.code === '23505') { skipped++ } // unique violation
        else { errors.push(`${row.name}: ${error.message}`) }
      } else {
        created++
      }
    }

    console.log(`[import-guests] ✓ created=${created} skipped=${skipped} errors=${errors.length}`)
    return Response.json({ created, skipped, errors })

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[import-guests] unhandled error:', message)
    return Response.json({ error: `Internal server error: ${message}` }, { status: 500 })
  }
}
