import { redirect } from 'next/navigation'

// /w with no slug — redirect back to the landing page
export default function WeddingIndexPage() {
  redirect('/')
}
