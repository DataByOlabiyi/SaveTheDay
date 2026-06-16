import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/utils/adminAuth'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Admin' },
  robots: { index: false, follow: false },
}

const NAV = [
  { href: '/admin',          label: 'Overview'  },
  { href: '/admin/users',    label: 'Users'     },
  { href: '/admin/weddings', label: 'Weddings'  },
  { href: '/admin/team',     label: 'Team'      },
  { href: '/admin/audit',    label: 'Audit Log' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireAdmin()
  if (!identity) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-obsidian text-ivory flex">

      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 sticky top-0 h-screen"
        style={{ background: '#09090B', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="px-5 h-14 flex items-center border-b border-white/[0.05]">
          <Link href="/" className="font-display text-gold text-lg italic tracking-wide">
            Save The Day
          </Link>
        </div>

        <div className="px-3 py-2 border-b border-white/[0.05]">
          <span
            className="inline-block font-body text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-sm"
            style={{ background: 'rgba(201,168,76,0.08)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            {identity.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV.map(item => {
            if (item.href === '/admin/team' && identity.role !== 'super_admin') return null
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center px-3 py-2.5 rounded-xl font-body text-sm tracking-wide text-ivory/40 hover:text-ivory/70 hover:bg-white/[0.04] transition-colors"
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/[0.05]">
          <p className="font-body text-[10px] text-ivory/25 truncate px-3 mb-2">{identity.email}</p>
          <form action="/auth/signout" method="POST" className="mt-1">
            <button
              type="submit"
              className="w-full text-left px-3 py-2 rounded-xl font-body text-xs text-ivory/25 hover:text-ivory/50 transition-colors tracking-wide"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 flex items-end justify-between px-4 pb-3"
        style={{ background: 'rgba(9,9,11,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <span className="font-display text-gold text-base italic">Admin</span>
        <div className="flex items-center gap-4">
          {NAV.slice(0, 4).map(item => (
            <Link key={item.href} href={item.href} className="font-body text-xs text-ivory/40 hover:text-ivory transition-colors">
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 md:pt-0" style={{ paddingTop: 'calc(max(env(safe-area-inset-top), 12px) + 36px)' }}>
        {children}
      </div>
    </div>
  )
}
