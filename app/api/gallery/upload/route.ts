import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { MAX_GALLERY_PHOTOS } from '@/lib/constants'

const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BUCKET        = 'wedding-gallery'

// POST /api/gallery/upload
// multipart/form-data: file, weddingId, albumId (optional), caption (optional), secret
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = checkRateLimit({ key: `gallery-upload:${ip}`, limit: 20, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const secret    = formData.get('secret')?.toString()
  const weddingId = formData.get('weddingId')?.toString()
  const albumId   = formData.get('albumId')?.toString() || null
  const caption   = formData.get('caption')?.toString() || null
  const file      = formData.get('file') as File | null

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!weddingId || !file) {
    return NextResponse.json({ error: 'weddingId and file required' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 413 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Use JPEG, PNG, WebP or GIF.' }, { status: 415 })
  }

  const supabase = createAdminClient()

  // Enforce per-wedding photo cap
  const { count, error: countError } = await supabase
    .from('gallery_photos')
    .select('id', { count: 'exact', head: true })
    .eq('wedding_id', weddingId)

  if (!countError && (count ?? 0) >= MAX_GALLERY_PHOTOS) {
    return NextResponse.json(
      { error: `Gallery is full — maximum ${MAX_GALLERY_PHOTOS} photos per wedding.` },
      { status: 422 },
    )
  }

  // Build a unique path: weddingId/timestamp-randomhex.ext
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${weddingId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert:      false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path)

  // Insert record
  const { data: photo, error: dbError } = await supabase
    .from('gallery_photos')
    .insert({
      wedding_id:    weddingId,
      album_id:      albumId,
      url:           publicUrl,
      thumbnail_url: publicUrl,   // same for now; swap with resized version via imgproxy/Cloudinary
      caption,
      sort_order:    Date.now(),  // auto-order by upload time
    })
    .select()
    .single()

  if (dbError) {
    console.error('Gallery insert error:', dbError)
    return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 })
  }

  return NextResponse.json({ photo, publicUrl }, { status: 201 })
}
