import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getWeddingBySlugForOwner, getGuestsByWedding } from '@/lib/db/client'
import { createAdminClient } from '@/lib/db/client'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Studio | Save The Day',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: { weddingSlug: string }
}

export default async function WeddingStudioPage({ params }: PageProps) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/studio/${params.weddingSlug}`)

  const wedding = await getWeddingBySlugForOwner(params.weddingSlug, user.id)
  if (!wedding) notFound()

  // Fetch guests and gallery photo count in parallel
  const db = createAdminClient()
  const [guests, { count: galleryPhotoCount }] = await Promise.all([
    getGuestsByWedding(wedding.id),
    db.from('gallery_photos').select('id', { count: 'exact', head: true }).eq('wedding_id', wedding.id),
  ])

  return (
    <AdminDashboard
      wedding={wedding}
      guests={guests}
      userEmail={user.email ?? undefined}
      galleryPhotoCount={galleryPhotoCount ?? 0}
    />
  )
}
