import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'
import { MAX_GALLERY_PHOTOS } from '@/lib/constants'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BUCKET        = 'wedding-gallery'

// POST /api/gallery/guest-upload
// multipart/form-data: file, weddingId, guestId, caption (optional)
// No session required — guest identity is verified via guestId + weddingId pair.
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl = await checkRateLimitAsync({ key: `guest-upload:${ip}`, limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const weddingId = formData.get('weddingId')?.toString()
  const guestId   = formData.get('guestId')?.toString()
  const caption   = formData.get('caption')?.toString() || null
  const file      = formData.get('file') as File | null

  if (!weddingId || !guestId || !file) {
    return NextResponse.json({ error: 'weddingId, guestId, and file required' }, { status: 400 })
  }

  const db = createAdminClient()

  // Verify wedding exists, is published, and has guest uploads enabled
  const { data: wedding } = await db
    .from('weddings')
    .select('id, config')
    .eq('id', weddingId)
    .eq('status', 'published')
    .single()

  if (!wedding) return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
  if (!wedding.config?.show_post_uploads) {
    return NextResponse.json({ error: 'Photo uploads not enabled for this wedding' }, { status: 403 })
  }

  // Verify guest belongs to this wedding
  const { data: guest } = await db
    .from('guests')
    .select('id')
    .eq('id', guestId)
    .eq('wedding_id', weddingId)
    .single()

  if (!guest) return NextResponse.json({ error: 'Invalid guest' }, { status: 403 })

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 413 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Use JPEG, PNG, WebP or GIF.' }, { status: 415 })
  }

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
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Guest upload storage error:', uploadError)
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(uploadData.path)

  const { data: photo, error: dbError } = await db
    .from('gallery_photos')
    .insert({
      wedding_id:           weddingId,
      url:                  publicUrl,
      thumbnail_url:        publicUrl,
      caption,
      uploaded_by_guest_id: guestId,
      sort_order:           Date.now(),
    })
    .select()
    .single()

  if (dbError) {
    console.error('Guest upload DB error:', dbError)
    return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 })
  }

  return NextResponse.json({ photo, publicUrl }, { status: 201 })
}
