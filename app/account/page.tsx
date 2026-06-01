import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/db/client'
import { AccountSettingsForm } from './AccountSettingsForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Account Settings | Save The Day',
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/account')

  const profile = await getUserProfile(user.id)

  return (
    <div className="min-h-screen bg-obsidian">
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/studio" className="font-display text-gold text-xl italic tracking-wide">
          Save The Day
        </Link>
        <Link href="/studio" className="font-body text-ivory/30 text-xs hover:text-ivory/60 transition-colors tracking-wide">
          ← Dashboard
        </Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-2">Settings</p>
          <h1 className="font-display text-3xl text-ivory">Account</h1>
          <p className="font-body text-ivory/30 text-sm mt-1">{user.email}</p>
        </div>

        <AccountSettingsForm
          userId={user.id}
          initialAccountType={profile?.account_type ?? 'couple'}
          initialBusinessName={profile?.business_name ?? ''}
          initialFullName={profile?.full_name ?? ''}
        />

        <div className="mt-10 pt-8 border-t border-white/5">
          <p className="font-body text-ivory/20 text-xs mb-4">
            To sign out on all devices, sign out below.
          </p>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="font-body text-xs text-ivory/30 hover:text-ivory/60 transition-colors tracking-wide"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
