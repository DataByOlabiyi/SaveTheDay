import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getWeddingBySlug, getGuestBySlug } from '@/lib/db/client'
import { GiftRegistryPage } from '@/components/scenes/GiftRegistryPage'

interface PageProps {
  params: { weddingSlug: string; guestSlug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding) return {}
  return {
    title: `Gift Registry — ${wedding.couple_names.name1} & ${wedding.couple_names.name2}`,
    robots: { index: false, follow: false },
  }
}

export default async function PersonalizedRegistryPage({ params }: PageProps) {
  const wedding = await getWeddingBySlug(params.weddingSlug)
  if (!wedding) notFound()

  if (!wedding.config.show_gift_registry) {
    redirect(`/e/${params.weddingSlug}/${params.guestSlug}`)
  }

  const rawGuest = await getGuestBySlug(wedding.id, params.guestSlug)
  const guest    = rawGuest?.is_blocked ? null : rawGuest

  return (
    <GiftRegistryPage
      wedding={wedding}
      guest={guest}
      backHref={`/e/${params.weddingSlug}/${params.guestSlug}`}
    />
  )
}
