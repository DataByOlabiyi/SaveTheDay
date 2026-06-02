import { redirect } from 'next/navigation'

// Legacy bare /:slug route — canonical URL is /e/:slug
// Permanent redirect keeps old bookmarks and QR codes working
export default function LegacyWeddingPage({
  params,
  searchParams,
}: {
  params: { weddingSlug: string }
  searchParams: { guest?: string }
}) {
  const qs = searchParams.guest ? `?guest=${searchParams.guest}` : ''
  redirect(`/e/${params.weddingSlug}${qs}`)
}
