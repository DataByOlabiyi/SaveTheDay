import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { TheUnveilingPage } from '@/components/scenes/TheUnveilingPage'
import {
  getWeddingBySlug, getWeddingBySlugForOwner, getGuestBySlug, getEventSchedule,
  getStoryMilestones, getGalleryAlbums, getGalleryPhotos,
} from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildOGMetadata } from '@/lib/personalization/guest'

interface PageProps {
  params: { weddingSlug: string }
  searchParams: { guest?: string }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding) return {}

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
    robots: guest ? { index: false, follow: false } : undefined,
  }
}

export default async function WeddingPage({ params, searchParams }: PageProps) {
  const wedding = await getWeddingBySlug(params.weddingSlug)

  if (!wedding) {
    // If the wedding isn't published, check if the logged-in user owns it
    // and redirect them to the owner preview instead of showing 404
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const owned = await getWeddingBySlugForOwner(params.weddingSlug, user.id)
      if (owned) redirect(`/w/${params.weddingSlug}`)
    }
    notFound()
  }

  const [guest, schedule, allMilestones, allAlbums, photos] = await Promise.all([
    searchParams.guest
      ? getGuestBySlug(wedding.id, searchParams.guest)
      : Promise.resolve(null),
    wedding.config.show_schedule !== false ? getEventSchedule(wedding.id) : Promise.resolve([]),
    wedding.config.show_story !== false    ? getStoryMilestones(wedding.id) : Promise.resolve([]),
    wedding.config.show_gallery !== false  ? getGalleryAlbums(wedding.id) : Promise.resolve([]),
    wedding.config.show_gallery !== false  ? getGalleryPhotos(wedding.id) : Promise.resolve([]),
  ])

  // Only show milestones the couple has actually written — empty stubs stay hidden from guests
  const milestones = allMilestones.filter(
    m => m.description && m.description.trim().length > 0
  )

  // Only show albums that have at least one photo uploaded
  const photoCountByAlbum = photos.reduce<Record<string, number>>((acc, p) => {
    if (p.album_id) acc[p.album_id] = (acc[p.album_id] ?? 0) + 1
    return acc
  }, {})
  const albums = allAlbums.filter(a => (photoCountByAlbum[a.id] ?? 0) > 0)

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
