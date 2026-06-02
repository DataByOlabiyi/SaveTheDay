'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminUserRow } from '@/lib/db/admin'

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<AdminUserRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(0)
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`)
      const data = await res.json()
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load() }, [load])

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Permanently delete ${email} and all their data?`)) return
    const input = window.prompt('Type DELETE to confirm:')
    if (input !== 'DELETE') return
    await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' })
    load()
  }

  const roleColor = (role: string) =>
    role === 'super_admin' ? 'text-gold' :
    role === 'admin'       ? 'text-blue-400' : 'text-ivory/30'

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-1">Admin</p>
          <h1 className="font-display text-3xl text-ivory" style={{ fontWeight: 300 }}>Users</h1>
        </div>
        <p className="font-body text-ivory/30 text-sm">{total} total</p>
      </div>

      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by email or name…"
          className="w-full max-w-sm bg-white/5 border border-white/10 focus:border-gold/40 text-ivory font-body text-sm px-4 py-2.5 rounded-xl outline-none transition-colors placeholder:text-ivory/20"
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Email', 'Name', 'Type', 'Role', 'Weddings', 'Joined', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="py-16 text-center font-body text-ivory/20 text-sm">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} className="py-16 text-center font-body text-ivory/20 text-sm">No users found</td></tr>
            )}
            {users.map(u => (
              <tr key={u.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="py-3 px-4 font-body text-sm text-ivory/70">{u.email}</td>
                <td className="py-3 px-4 font-body text-sm text-ivory/40">{u.full_name || '—'}</td>
                <td className="py-3 px-4 font-body text-xs text-ivory/30 capitalize">{u.account_type}</td>
                <td className={`py-3 px-4 font-body text-xs capitalize ${roleColor(u.role)}`}>{u.role}</td>
                <td className="py-3 px-4 font-body text-sm text-ivory/40">{u.wedding_count}</td>
                <td className="py-3 px-4 font-body text-xs text-ivory/25">
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-3 px-4">
                  {u.role !== 'super_admin' && (
                    <button onClick={() => deleteUser(u.id, u.email)}
                      className="font-body text-xs text-red-500/30 hover:text-red-400/70 transition-colors">
                      Delete
                    </button>
                  )}
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
