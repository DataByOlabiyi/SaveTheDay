import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'
import { MAX_GALLERY_PHOTOS } from '@/lib/constants'
import { sanitizeText } from '@/lib/utils/sanitize'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BUCKET        = 'wedding-gallery'

// POST /api/gallery/upload
// multipart/form-data: file, weddingId, albumId (optional), caption (optional)
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `gallery-upload:${ip}`, limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const weddingId    = formData.get('weddingId')?.toString()
  const albumId      = formData.get('albumId')?.toString() || null
  const rawCaption   = formData.get('caption')?.toString() || null
  const caption      = rawCaption !== null ? sanitizeText(rawCaption) : null
  const file         = formData.get('file') as File | null

  if (!weddingId || !file) {
    return NextResponse.json({ error: 'weddingId and file required' }, { status: 400 })
  }

  // Verify ownership
  const db = createAdminClient()
  const { data: wedding } = await db
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!wedding) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 413 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Use JPEG, PNG, WebP or GIF.' }, { status: 415 })
  }

  // Enforce per-wedding photo cap
  const { count, error: countError } = await db
    .from('gallery_photos')
    .select('id', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)

  if (!countError && (count ?? 0) >= MAX_GALLERY_PHOTOS) {
    return NextResponse.json(
      { error: `Gallery is full — maximum ${MAX_GALLERY_PHOTOS} photos per wedding.` },
      { status: 422 },
    )
  }

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${weddingId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { data: uploadData, error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert:      false,
    })

  if (uploadError) {
    Sentry.captureException(uploadError)
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(uploadData.path)

  const { data: photo, error: dbError } = await db
    .from('gallery_photos')
    .insert({
      wedding_id:    weddingId,
      album_id:      albumId,
      url:           publicUrl,
      thumbnail_url: publicUrl,
      caption,
      sort_order:    Math.floor(Date.now() / 1000),
    })
    .select()
    .single()

  if (dbError) {
    Sentry.captureException(dbError)
    console.error('Gallery insert error:', dbError)
    return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 })
  }

  return NextResponse.json({ photo, publicUrl }, { status: 201 })
}
