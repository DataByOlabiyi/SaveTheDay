import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getWeddingBySlug,
  getGalleryAlbums,
  getGalleryPhotos,
  getGuestBySlug,
} from '@/lib/db/client'
import { FullGalleryPage } from '@/components/organisms/FullGalleryPage'

interface PageProps {
  params:       { weddingSlug: string }
  searchParams: { guest?: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding) return {}
  return {
    title: `Gallery — ${wedding.couple_names.name1} & ${wedding.couple_names.name2}`,
    robots: { index: false, follow: false },
  }
}

export default async function GalleryPage({ params, searchParams }: PageProps) {
  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding || wedding.config.show_gallery === false) notFound()

  const [albums, photos, guest] = await Promise.all([
    getGalleryAlbums(wedding.id),
    getGalleryPhotos(wedding.id),
    searchParams.guest
      ? getGuestBySlug(wedding.id, searchParams.guest)
      : Promise.resolve(null),
  ])

  // Back link: if guest slug was provided, return to personalised page
  const backHref = searchParams.guest
    ? `/${params.weddingSlug}/${searchParams.guest}`
    : `/${params.weddingSlug}`

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
