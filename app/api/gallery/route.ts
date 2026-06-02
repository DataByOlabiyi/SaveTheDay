import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { sanitizeText, clampString, isSafeUrl } from '@/lib/utils/sanitize'

async function assertOwnership(userId: string, weddingId: string): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('user_id', userId)
    .single()
  return !!data
}

// ── GET /api/gallery?weddingId=...&albumId=... ────────────────────────────────
export async function GET(req: NextRequest) {
  const weddingId = req.nextUrl.searchParams.get('weddingId')
  const albumId   = req.nextUrl.searchParams.get('albumId')

  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })

  try {
    const db = createAdminClient()

    const tableNotFound = (err: unknown) =>
      (err as { code?: string } | null)?.code === 'PGRST205' ||
      (err as { code?: string } | null)?.code === 'PGRST200'

    const [albumsRes, photosRes] = await Promise.all([
      db.from('gallery_albums')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order', { ascending: true }),
      (() => {
        let q = db.from('gallery_photos')
          .select('*')
          .eq('wedding_id', weddingId)
          .order('sort_order', { ascending: true })
        if (albumId) q = q.eq('album_id', albumId)
        return q
      })(),
    ])

    if (albumsRes.error && !tableNotFound(albumsRes.error)) throw albumsRes.error
    if (photosRes.error && !tableNotFound(photosRes.error)) throw photosRes.error

    return NextResponse.json({
      albums: albumsRes.data ?? [],
      photos: photosRes.data ?? [],
    })
  } catch (err) {
    console.error('Gallery GET error:', err)
    return NextResponse.json({ albums: [], photos: [] })
  }
}

// ── POST /api/gallery — create album or add photo ─────────────────────────────
const albumSchema = z.object({
  type:        z.literal('album'),
  weddingId:   z.string().uuid(),
  id:          z.string().uuid().optional(),
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  cover_url:   z.string().url().optional(),
  sort_order:  z.number().int().min(0).optional(),
})

const photoSchema = z.object({
  type:          z.literal('photo'),
  weddingId:     z.string().uuid(),
  id:            z.string().uuid().optional(),
  albumId:       z.string().uuid().optional(),
  url:           z.string().url(),
  thumbnail_url: z.string().url().optional(),
  caption:       z.string().max(500).optional(),
  width:         z.number().int().optional(),
  height:        z.number().int().optional(),
  sort_order:    z.number().int().min(0).optional(),
})

const bodySchema = z.union([albumSchema, photoSchema])

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = checkRateLimit({ key: `gallery-write:${ip}`, limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId } = parsed.data

  const isOwner = await assertOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()

  try {
    if (parsed.data.type === 'album') {
      const { id, name, description, cover_url, sort_order } = parsed.data
      const payload = {
        wedding_id:  weddingId,
        name:        sanitizeText(clampString(name, 100)),
        description: description ? sanitizeText(description) : null,
        cover_url:   cover_url && isSafeUrl(cover_url) ? cover_url : null,
        sort_order:  sort_order ?? 0,
      }

      if (id) {
        const { data, error } = await db.from('gallery_albums').update(payload).eq('id', id).select().single()
        if (error) throw error
        return NextResponse.json({ album: data })
      } else {
        const { data, error } = await db.from('gallery_albums').insert(payload).select().single()
        if (error) throw error
        return NextResponse.json({ album: data }, { status: 201 })
      }
    }

    // type === 'photo'
    const { id, albumId, url, thumbnail_url, caption, width, height, sort_order } = parsed.data as z.infer<typeof photoSchema>
    if (!isSafeUrl(url)) return NextResponse.json({ error: 'Invalid URL' }, { status: 422 })

    const payload = {
      wedding_id:    weddingId,
      album_id:      albumId ?? null,
      url,
      thumbnail_url: thumbnail_url && isSafeUrl(thumbnail_url) ? thumbnail_url : null,
      caption:       caption ? sanitizeText(clampString(caption, 500)) : null,
      width:         width ?? null,
      height:        height ?? null,
      sort_order:    sort_order ?? 0,
    }

    if (id) {
      const { data, error } = await db.from('gallery_photos').update(payload).eq('id', id).select().single()
      if (error) throw error
      return NextResponse.json({ photo: data })
    } else {
      const { data, error } = await db.from('gallery_photos').insert(payload).select().single()
      if (error) throw error
      return NextResponse.json({ photo: data }, { status: 201 })
    }
  } catch (err) {
    console.error('Gallery POST error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

// ── DELETE /api/gallery?type=photo|album&id=...&weddingId=... ─────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type      = req.nextUrl.searchParams.get('type')
  const id        = req.nextUrl.searchParams.get('id')
  const weddingId = req.nextUrl.searchParams.get('weddingId')

  if (!type || !id || !weddingId) {
    return NextResponse.json({ error: 'type, id and weddingId required' }, { status: 400 })
  }

  const isOwner = await assertOwnership(user.id, weddingId)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const table = type === 'album' ? 'gallery_albums' : 'gallery_photos'
  try {
    const db = createAdminClient()
    const { error } = await db.from(table).delete().eq('id', id).eq('wedding_id', weddingId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Gallery DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
