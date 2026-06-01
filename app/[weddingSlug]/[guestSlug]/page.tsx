import { redirect } from 'next/navigation'

// Legacy bare /:slug/:guestSlug route — canonical URL is /e/:slug/:guestSlug
export default function LegacyGuestPage({
  params,
}: {
  params: { weddingSlug: string; guestSlug: string }
}) {
  redirect(`/e/${params.weddingSlug}/${params.guestSlug}`)
}
