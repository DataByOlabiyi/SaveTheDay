import { createAdminClient } from '@/lib/db/client'
import { slugify } from '@/lib/utils/slugify'

// ──────────────────────────────────────────────────────────────
// GET /api/admin/guests?weddingId=...&secret=...
// Fetch all guests for a wedding (used to refresh the list client-side)
// ──────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret    = searchParams.get('secret') ?? ''
  const weddingId = searchParams.get('weddingId') ?? ''

  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || secret !== adminSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!weddingId) return Response.json({ error: 'weddingId required' }, { status: 400 })

  let db: ReturnType<typeof createAdminClient>
  try { db = createAdminClient() } catch (e) {
    return Response.json({ error: 'Server config error' }, { status: 500 })
  }

  const { data, error } = await db
    .from('guests')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('name', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ guests: data })
}

// ──────────────────────────────────────────────────────────────
// POST /api/admin/guests
// Add a single guest to a wedding.
// Body: { secret, weddingId, name, email?, phone? }
// ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    // ── Parse body ──────────────────────────────────────────────
    const body = await req.json().catch(() => null)
    if (!body) return Response.json({ error: 'Invalid request body' }, { status: 400 })

    const { secret, weddingId, name, email, phone } = body as Record<string, string>

    // ── Auth ────────────────────────────────────────────────────
    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret || secret !== adminSecret) {
      console.error('[add-guest] Unauthorized attempt')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!weddingId) return Response.json({ error: 'weddingId is required' }, { status: 400 })
    if (!name?.trim()) return Response.json({ error: 'name is required' }, { status: 400 })

    console.log(`[add-guest] Adding "${name}" to wedding ${weddingId}`)

    // ── Admin DB client ─────────────────────────────────────────
    let db: ReturnType<typeof createAdminClient>
    try {
      db = createAdminClient()
    } catch (e) {
      console.error('[add-guest] createAdminClient failed:', e)
      return Response.json({ error: 'Server config error — SUPABASE_SERVICE_ROLE_KEY missing' }, { status: 500 })
    }

    // ── Slug uniqueness: fetch all existing slugs in one query ──
    const { data: existingGuests, error: slugFetchError } = await db
      .from('guests')
      .select('slug')
      .eq('wedding_id', weddingId)

    if (slugFetchError) {
      // Non-fatal: log and proceed — insert will fail on unique constraint
      // which is a safe fallback rather than looping forever
      console.error('[add-guest] slug fetch error:', slugFetchError.message)
    }

    const usedSlugs = new Set((existingGuests ?? []).map((g: { slug: string }) => g.slug))

    const baseSlug = slugify(name.trim())
    let slug = baseSlug
    let attempt = 0
    while (usedSlugs.has(slug)) {
      attempt++
      slug = `${baseSlug}-${attempt + 1}`
    }

    console.log(`[add-guest] Using slug: "${slug}"`)

    // ── Insert ──────────────────────────────────────────────────
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

    if (error) {
      console.error('[add-guest] insert error:', error.message, '| code:', error.code, '| details:', error.details)
      return Response.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 500 }
      )
    }

    console.log(`[add-guest] ✓ Created guest id=${data.id} slug="${data.slug}"`)
    return Response.json({ guest: data }, { status: 201 })

  } catch (e) {
    // Catch-all for unexpected errors (e.g. JSON parse failures, Supabase SDK bugs)
    const message = e instanceof Error ? e.message : String(e)
    console.error('[add-guest] unhandled error:', message)
    return Response.json({ error: `Internal server error: ${message}` }, { status: 500 })
  }
}
