import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TheUnveilingPage } from '@/components/scenes/TheUnveilingPage'
import { getWeddingBySlug, getGuestBySlug, getEventSchedule, getStoryMilestones, getGalleryAlbums, getGalleryPhotos } from '@/lib/db/client'
import { buildOGMetadata } from '@/lib/personalization/guest'

interface PageProps {
  params: { weddingSlug: string }
  /**
   * ?guest=temi-johnson — shorthand for personalised experience
   * without knowing the full /weddingSlug/guestSlug URL structure.
   * Useful for QR codes on physical invitations.
   */
  searchParams: { guest?: string }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding) return {}

  // Resolve guest for personalised OG metadata if slug provided
  const guest = searchParams.guest
    ? await getGuestBySlug(wedding.id, searchParams.guest)
    : null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const og = buildOGMetadata({
    coupleName1: wedding.couple_names.name1,
    coupleName2: wedding.couple_names.name2,
    guestName: guest?.name,
    appUrl,
    weddingSlug: params.weddingSlug,
  })

  return {
    title: og.title,
    description: og.description,
    openGraph: {
      title: og.title,
      description: og.description,
      images: [{ url: og.image, width: 1200, height: 630 }],
      url: og.url,
    },
    twitter: {
      card: 'summary_large_image',
      title: og.title,
      description: og.description,
      images: [og.image],
    },
    // Personalised pages must not be indexed
    robots: guest ? { index: false, follow: false } : undefined,
  }
}

export default async function WeddingPage({ params, searchParams }: PageProps) {
  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding) notFound()

  // Fetch all page data in parallel
  const [guest, schedule, milestones, albums, photos] = await Promise.all([
    searchParams.guest
      ? getGuestBySlug(wedding.id, searchParams.guest)
      : Promise.resolve(null),
    wedding.config.show_schedule !== false
      ? getEventSchedule(wedding.id)
      : Promise.resolve([]),
    wedding.config.show_story !== false
      ? getStoryMilestones(wedding.id)
      : Promise.resolve([]),
    wedding.config.show_gallery !== false
      ? getGalleryAlbums(wedding.id)
      : Promise.resolve([]),
    wedding.config.show_gallery !== false
      ? getGalleryPhotos(wedding.id)
      : Promise.resolve([]),
  ])

  return (
    <TheUnveilingPage
      wedding={wedding}
      guest={guest}
      schedule={schedule}
      milestones={milestones}
      albums={albums}
      photos={photos}
    />
  )
}
