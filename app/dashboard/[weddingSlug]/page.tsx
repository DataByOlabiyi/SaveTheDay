import { redirect } from 'next/navigation'

// Permanently redirected — canonical URL is /studio/[slug]
export default function DashboardSlugRedirect({
  params,
}: {
  params: { weddingSlug: string }
}) {
  redirect(`/studio/${params.weddingSlug}`)
}
