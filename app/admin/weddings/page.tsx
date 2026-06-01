'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AdminWeddingRow } from '@/lib/db/admin'

const STATUS_COLORS: Record<string, string> = {
  published: 'text-emerald-400',
  ready:     'text-blue-400',
  draft:     'text-ivory/30',
}

export default function AdminWeddingsPage() {
  const [weddings, setWeddings] = useState<AdminWeddingRow[]>([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(0)
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/weddings-list?page=${page}&search=${encodeURIComponent(search)}`)
      const data = await res.json()
      setWeddings(data.weddings ?? [])
      setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load() }, [load])

  const deleteWedding = async (weddingId: string, coupleName: string) => {
    if (!confirm(`Delete the wedding for ${coupleName}? This cannot be undone.`)) return
    await fetch(`/api/admin/weddings-list?weddingId=${weddingId}`, { method: 'DELETE' })
    load()
  }

  const setStatus = async (weddingId: string, status: string) => {
    await fetch('/api/admin/weddings-list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weddingId, status }),
    })
    load()
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-1">Admin</p>
          <h1 className="font-display text-3xl text-ivory" style={{ fontWeight: 300 }}>Weddings</h1>
        </div>
        <p className="font-body text-ivory/30 text-sm">{total} total</p>
      </div>

      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by couple, slug, city, venue…"
          className="w-full max-w-sm bg-white/5 border border-white/10 focus:border-gold/40 text-ivory font-body text-sm px-4 py-2.5 rounded-xl outline-none transition-colors placeholder:text-ivory/20"
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Couple', 'Slug', 'Owner', 'Status', 'Guests', 'Date', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="py-16 text-center font-body text-ivory/20 text-sm">Loading…</td></tr>
            )}
            {!loading && weddings.length === 0 && (
              <tr><td colSpan={7} className="py-16 text-center font-body text-ivory/20 text-sm">No weddings found</td></tr>
            )}
            {weddings.map(w => (
              <tr key={w.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="py-3 px-4 font-body text-sm text-ivory/80">
                  {w.couple_names.name1} & {w.couple_names.name2}
                </td>
                <td className="py-3 px-4">
                  <a href={`/e/${w.slug}`} target="_blank" rel="noopener noreferrer"
                    className="font-body text-xs text-gold/50 hover:text-gold transition-colors">
                    /e/{w.slug}
                  </a>
                </td>
                <td className="py-3 px-4 font-body text-xs text-ivory/30">{w.owner_email}</td>
                <td className="py-3 px-4">
                  <select
                    value={w.status}
                    onChange={e => setStatus(w.id, e.target.value)}
                    className={`bg-transparent font-body text-xs capitalize outline-none cursor-pointer ${STATUS_COLORS[w.status] ?? 'text-ivory/30'}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="ready">Ready</option>
                    <option value="published">Published</option>
                  </select>
                </td>
                <td className="py-3 px-4 font-body text-sm text-ivory/40">{w.guest_count}</td>
                <td className="py-3 px-4 font-body text-xs text-ivory/25">
                  {new Date(w.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => deleteWedding(w.id, `${w.couple_names.name1} & ${w.couple_names.name2}`)}
                    className="font-body text-xs text-red-500/30 hover:text-red-400/70 transition-colors"
                  >
                    Delete
                  </button>
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
