import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TheUnveilingPage } from '@/components/scenes/TheUnveilingPage'
import { ErrorBoundary } from '@/components/atoms/ErrorBoundary'
import { PasswordGate } from '@/components/atoms/PasswordGate'
import {
  getWeddingBySlug, checkWeddingExists, getGuestBySlug, getEventSchedule,
  getStoryMilestones, getGalleryAlbums, getGalleryPhotos,
} from '@/lib/db/client'
import { buildOGMetadata } from '@/lib/personalization/guest'
import { WeddingComingSoon } from '@/components/atoms/WeddingComingSoon'

interface PageProps {
  params: { weddingSlug: string; guestSlug: string }
}

// Personalized pages revalidate every 30s — guest RSVP status updates appear quickly
// without hitting Supabase on every single page load.
export const revalidate = 30

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding) return {}

  const guest = await getGuestBySlug(wedding.id, params.guestSlug)
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
    robots: { index: false, follow: false },
  }
}

export default async function PersonalizedWeddingPage({ params }: PageProps) {
  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding) {
    const exists = await checkWeddingExists(params.weddingSlug)
    if (!exists) notFound()
    return <WeddingComingSoon />
  }

  const [rawGuest, schedule, milestones, albums, photos] = await Promise.all([
    getGuestBySlug(wedding.id, params.guestSlug),
    wedding.config.show_schedule !== false ? getEventSchedule(wedding.id) : Promise.resolve([]),
    wedding.config.show_story !== false    ? getStoryMilestones(wedding.id) : Promise.resolve([]),
    wedding.config.show_gallery !== false  ? getGalleryAlbums(wedding.id) : Promise.resolve([]),
    wedding.config.show_gallery !== false  ? getGalleryPhotos(wedding.id) : Promise.resolve([]),
  ])

  // Blocked guests lose personalisation and RSVP access — they see the generic view
  const guest = rawGuest?.is_blocked ? null : rawGuest

  const invitation = (
    <TheUnveilingPage
      wedding={wedding}
      guest={guest}
      schedule={schedule}
      milestones={milestones}
      albums={albums}
      photos={photos}
    />
  )

  return (
    <ErrorBoundary>
      {wedding.config.is_private ? (
        <PasswordGate
          slug={wedding.slug}
          coupleName1={wedding.couple_names.name1}
          coupleName2={wedding.couple_names.name2}
        >
          {invitation}
        </PasswordGate>
      ) : invitation}
    </ErrorBoundary>
  )
}
