import { redirect } from 'next/navigation'

// Root page — redirect to demo or show landing
export default function RootPage() {
  // In production this redirects to the demo wedding or a landing page
  redirect('/demo-wedding')
}
