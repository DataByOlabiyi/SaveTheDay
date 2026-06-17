import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { AdminChangePasswordForm } from './AdminChangePasswordForm'

export const metadata: Metadata = { title: 'Settings' }

export default async function AdminSettingsPage() {
  const identity = await requireAdmin()

  return (
    <div className="px-6 py-10 max-w-lg">
      <div className="mb-8">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-2">Admin</p>
        <h1 className="font-display text-3xl text-ivory">Settings</h1>
      </div>

      {/* Email row */}
      <div className="mb-8 p-4 border border-white/5 rounded-sm" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <p className="font-body text-ivory/25 text-xs tracking-widest uppercase mb-1">Signed in as</p>
        <p className="font-body text-ivory/80 text-sm">{identity.email}</p>
      </div>

      <div className="pt-2">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-1">Security</p>
        <h2 className="font-display text-xl text-ivory mb-6">Change password</h2>
        <AdminChangePasswordForm />
      </div>
    </div>
  )
}
