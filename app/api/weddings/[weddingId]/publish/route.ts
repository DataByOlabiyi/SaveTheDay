import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient, updateWeddingStatus } from '@/lib/db/client'

// POST /api/weddings/[weddingId]/publish — publish or unpublish a wedding
// Body (JSON): { action: 'publish' | 'unpublish' }  (form POST defaults to publish)
export async function POST(
  request: NextRequest,
  { params }: { params: { weddingId: string } }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const admin = createAdminClient()
  const { data: wedding, error } = await admin
    .from('weddings')
    .select('id, slug, user_id')
    .eq('id', params.weddingId)
    .eq('user_id', user.id)
    .single()

  if (error || !wedding) {
    return NextResponse.redirect(new URL('/studio', request.url))
  }

  // Detect action from JSON body (fetch calls) or default to publish (form POST)
  let action: 'publish' | 'unpublish' = 'publish'
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      const body = await request.json()
      if (body.action === 'unpublish') action = 'unpublish'
    } catch { /* use default */ }
  }

  const newStatus = action === 'unpublish' ? 'draft' : 'published'
  await updateWeddingStatus(params.weddingId, newStatus)

  // JSON fetch — return JSON response instead of redirect
  if (contentType.includes('application/json')) {
    return NextResponse.json({ success: true, status: newStatus })
  }

  return NextResponse.redirect(
    new URL(`/studio/${wedding.slug}`, request.url)
  )
}
