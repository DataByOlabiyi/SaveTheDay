import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/db/client'
import { AccountSettingsForm } from './AccountSettingsForm'
import { AccountDangerZone } from './AccountDangerZone'

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
        </div>

        {/* Email row */}
        <div className="mb-8 p-4 border border-white/5 rounded-sm" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <p className="font-body text-ivory/25 text-xs tracking-widest uppercase mb-1">Signed in as</p>
          <p className="font-body text-ivory/80 text-sm">{user.email}</p>
          <p className="font-body text-ivory/20 text-xs mt-2 leading-relaxed">
            To change your email address, sign out and sign in with a new email, or contact support.
          </p>
        </div>

        <AccountSettingsForm
          userId={user.id}
          initialAccountType={profile?.account_type ?? 'couple'}
          initialBusinessName={profile?.business_name ?? ''}
          initialFullName={profile?.full_name ?? ''}
        />

        <div className="mt-10 pt-8 border-t border-white/5">
          <p className="font-body text-ivory/30 text-sm mb-4">
            Ready to leave?
          </p>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="font-body text-sm text-red-400/70 hover:text-red-400 transition-colors tracking-wide border border-red-500/20 hover:border-red-500/40 px-5 py-2.5 rounded-sm"
            >
              Sign out
            </button>
          </form>
        </div>

        <AccountDangerZone />
      </div>
    </div>
  )
}
