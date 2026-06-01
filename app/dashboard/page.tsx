import { redirect } from 'next/navigation'

// Permanently redirected — canonical URL is /studio
export default function DashboardRedirect() {
  redirect('/studio')
}
