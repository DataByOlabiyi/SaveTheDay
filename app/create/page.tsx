import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OnboardingWizard } from './OnboardingWizard'

export const metadata: Metadata = {
  title: 'Get Started | Save The Day',
  robots: { index: false, follow: false },
}

export default async function CreatePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/create')

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center px-6 py-16">
      <OnboardingWizard userEmail={user.email ?? ''} userId={user.id} />
    </div>
  )
}
