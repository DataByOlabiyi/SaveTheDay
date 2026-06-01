import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getWeddingBySlug, getWeddingBySlugForOwner, getGalleryAlbums, getGalleryPhotos, getGuestBySlug,
} from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { FullGalleryPage } from '@/components/organisms/FullGalleryPage'
import type { Wedding } from '@/lib/db/types'

async function getWeddingForPreview(slug: string): Promise<Wedding | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const owned = await getWeddingBySlugForOwner(slug, user.id)
    if (owned) return owned
  }
  return getWeddingBySlug(slug)
}

interface PageProps {
  params:       { weddingSlug: string }
  searchParams: { guest?: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wedding = await getWeddingForPreview(params.weddingSlug)
  if (!wedding) return {}
  return {
    title: `Gallery — ${wedding.couple_names.name1} & ${wedding.couple_names.name2}`,
    robots: { index: false, follow: false },
  }
}

export default async function GalleryPage({ params, searchParams }: PageProps) {
  const wedding = await getWeddingForPreview(params.weddingSlug)
  if (!wedding || wedding.config.show_gallery === false) notFound()

  const [albums, photos, guest] = await Promise.all([
    getGalleryAlbums(wedding.id),
    getGalleryPhotos(wedding.id),
    searchParams.guest
      ? getGuestBySlug(wedding.id, searchParams.guest)
      : Promise.resolve(null),
  ])

  const backHref = searchParams.guest
    ? `/w/${params.weddingSlug}/${searchParams.guest}`
    : `/w/${params.weddingSlug}`

  return (
    <FullGalleryPage
      wedding={wedding}
      albums={albums}
      photos={photos}
      guestId={guest?.id}
      backHref={backHref}
      allowDownloads={wedding.config.allow_downloads !== false}
    />
  )
}
