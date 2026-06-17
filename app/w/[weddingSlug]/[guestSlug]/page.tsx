import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TheUnveilingPage } from '@/components/scenes/TheUnveilingPage'
import { PasswordGate } from '@/components/atoms/PasswordGate'
import {
  getWeddingBySlug, getWeddingBySlugForOwner, getGuestBySlug, getEventSchedule,
  getStoryMilestones, getGalleryAlbums, getGalleryPhotos,
} from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildOGMetadata } from '@/lib/personalization/guest'
import type { Wedding } from '@/lib/db/types'

interface PageProps {
  params: { weddingSlug: string; guestSlug: string }
}

async function getWeddingForPreview(slug: string): Promise<Wedding | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const owned = await getWeddingBySlugForOwner(slug, user.id)
    if (owned) return owned
  }
  return getWeddingBySlug(slug)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wedding = await getWeddingForPreview(params.weddingSlug)
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
  const wedding = await getWeddingForPreview(params.weddingSlug)
  if (!wedding) notFound()

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

  return wedding.config.is_private ? (
    <PasswordGate
      slug={wedding.slug}
      coupleName1={wedding.couple_names.name1}
      coupleName2={wedding.couple_names.name2}
    >
      {invitation}
    </PasswordGate>
  ) : invitation
}
