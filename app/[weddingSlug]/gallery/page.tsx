import { redirect } from 'next/navigation'

// Legacy bare /:slug/gallery route — canonical URL is /e/:slug/gallery
export default function LegacyGalleryPage({
  params,
}: {
  params: { weddingSlug: string }
}) {
  redirect(`/e/${params.weddingSlug}/gallery`)
}
