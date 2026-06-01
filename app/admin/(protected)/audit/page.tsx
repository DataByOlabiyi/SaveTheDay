'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminAuditLog } from '@/lib/db/types'

const ACTION_COLOR: Record<string, string> = {
  delete_user:      'text-red-400',
  delete_wedding:   'text-red-400',
  promote_to_admin: 'text-emerald-400',
  remove_admin:     'text-amber-400',
  set_status_published: 'text-emerald-400',
  set_status_draft:     'text-ivory/40',
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AdminAuditLog[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/audit?page=${page}`)
      const data = await res.json()
      setEntries(data.entries ?? [])
      setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-1">Admin</p>
          <h1 className="font-display text-3xl text-ivory" style={{ fontWeight: 300 }}>Audit Log</h1>
        </div>
        <p className="font-body text-ivory/30 text-sm">{total} entries</p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['When', 'Admin', 'Action', 'Resource', 'Details'].map(h => (
                <th key={h} className="text-left py-3 px-4 font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="py-16 text-center font-body text-ivory/20 text-sm">Loading…</td></tr>
            )}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={5} className="py-16 text-center font-body text-ivory/20 text-sm">No audit entries yet</td></tr>
            )}
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="py-3 px-4 font-body text-xs text-ivory/30 whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-3 px-4 font-body text-xs text-ivory/50">{e.admin_email}</td>
                <td className={`py-3 px-4 font-body text-xs capitalize ${ACTION_COLOR[e.action] ?? 'text-ivory/50'}`}>
                  {e.action.replace(/_/g, ' ')}
                </td>
                <td className="py-3 px-4">
                  <span className="font-body text-xs text-ivory/30 capitalize">{e.resource_type}</span>
                  <span className="font-body text-xs text-ivory/20 ml-1.5 font-mono">{e.resource_id.slice(0, 8)}…</span>
                </td>
                <td className="py-3 px-4 font-body text-xs text-ivory/25">
                  {e.details ? JSON.stringify(e.details) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 50 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-white/[0.05]">
            <p className="font-body text-xs text-ivory/20">{page * 50 + 1}–{Math.min((page + 1) * 50, total)} of {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="font-body text-xs text-ivory/30 hover:text-ivory/60 disabled:opacity-25 transition-colors px-3 py-1">← Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 50 >= total}
                className="font-body text-xs text-ivory/30 hover:text-ivory/60 disabled:opacity-25 transition-colors px-3 py-1">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
