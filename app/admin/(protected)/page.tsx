import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { getPlatformStats } from '@/lib/db/admin'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Overview' }

function StatCard({ label, value, sub, accent = false }: {
  label: string; value: number | string; sub?: string; accent?: boolean
}) {
  return (
    <div
      className="rounded-2xl px-5 py-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="font-body text-[11px] tracking-[0.2em] uppercase text-ivory/30 mb-3">{label}</p>
      <p
        className="font-display"
        style={{ fontSize: '2.25rem', fontWeight: 300, lineHeight: 1, color: accent ? '#C9A84C' : '#FAF7F2' }}
      >
        {value}
      </p>
      {sub && <p className="font-body text-xs text-ivory/25 mt-1.5">{sub}</p>}
    </div>
  )
}

export default async function AdminOverviewPage() {
  const identity = await requireAdmin()
  if (!identity) redirect('/admin/login')

  const stats = await getPlatformStats()

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">

      <div className="mb-10">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-2">Admin Portal</p>
        <h1 className="font-display text-3xl text-ivory" style={{ fontWeight: 300 }}>Platform Overview</h1>
      </div>

      <section className="mb-8">
        <p className="font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25 mb-4">Growth</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users"    value={stats.total_users}     sub={`+${stats.signups_7d} this week`}    accent />
          <StatCard label="Signups (30d)"  value={stats.signups_30d}     sub={`+${stats.signups_7d} last 7 days`} />
          <StatCard label="Total Weddings" value={stats.total_weddings}   sub={`+${stats.weddings_7d} this week`} accent />
          <StatCard label="Live Weddings"  value={stats.published}        sub={`${stats.drafts} in draft`} />
        </div>
      </section>

      <section className="mb-8">
        <p className="font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25 mb-4">Engagement</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total Guests" value={stats.total_guests} />
          <StatCard label="RSVPs Received" value={stats.total_rsvps}
            sub={stats.total_guests > 0 ? `${Math.round((stats.total_rsvps / stats.total_guests) * 100)}% rate` : undefined}
            accent
          />
          <StatCard label="Avg guests / wedding"
            value={stats.total_weddings > 0 ? Math.round(stats.total_guests / stats.total_weddings) : 0}
          />
        </div>
      </section>

      <section>
        <p className="font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25 mb-4">Manage</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/admin/users',    label: 'Users',     count: stats.total_users     },
            { href: '/admin/weddings', label: 'Weddings',  count: stats.total_weddings  },
            { href: '/admin/team',     label: 'Team',      count: null                  },
            { href: '/admin/audit',    label: 'Audit Log', count: null                  },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-2xl p-5 flex flex-col justify-between hover:border-gold/20 transition-colors group"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', minHeight: 100 }}
            >
              <p className="font-body text-sm text-ivory/60 group-hover:text-ivory/90 transition-colors">{item.label}</p>
              {item.count !== null && (
                <p className="font-display text-2xl text-gold/70 group-hover:text-gold transition-colors" style={{ fontWeight: 300 }}>
                  {item.count}
                </p>
              )}
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
