import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { AdminChangePasswordForm } from './AdminChangePasswordForm'

export const metadata: Metadata = { title: 'Settings' }

export default async function AdminSettingsPage() {
  const identity = await requireAdmin()
  const isSuperAdmin = identity?.role === 'super_admin'

  return (
    <div className="px-6 py-10 max-w-lg">
      <div className="mb-8">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-2">Admin</p>
        <h1 className="font-display text-3xl text-ivory">Settings</h1>
      </div>

      {/* Account */}
      <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-body text-ivory/25 text-xs tracking-widest uppercase mb-3">Account</p>
        <div className="flex items-center justify-between gap-4">
          <p className="font-body text-ivory/80 text-sm">{identity?.email}</p>
          <span
            className="font-body text-xs px-2.5 py-1 rounded-full shrink-0"
            style={isSuperAdmin
              ? { background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(201,168,76,0.9)' }
              : { background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', color: 'rgba(96,165,250,0.8)' }
            }
          >
            {isSuperAdmin ? 'Super Admin' : 'Admin'}
          </span>
        </div>
        <p className="font-body text-xs text-ivory/25 mt-2 leading-relaxed">
          {isSuperAdmin
            ? 'Full access: users, weddings, team management, and all platform data.'
            : 'Can view platform data and manage users and weddings. Team management requires Super Admin.'}
        </p>
      </div>

      <div className="mt-8">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-1">Security</p>
        <h2 className="font-display text-xl text-ivory mb-6">Change password</h2>
        <AdminChangePasswordForm />
      </div>
    </div>
  )
}
