'use client'

import { useState, useEffect } from 'react'
import type { UserProfile } from '@/lib/db/types'

export default function AdminTeamPage() {
  const [members, setMembers] = useState<UserProfile[]>([])
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/team')
      const data = await res.json()
      setMembers(data.members ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true); setError(null); setSuccess(null)
    try {
      const res  = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(`${email} is now an admin.`)
      setEmail('')
      load()
    } finally { setAdding(false) }
  }

  const remove = async (userId: string, memberEmail: string) => {
    if (!confirm(`Remove admin access from ${memberEmail}?`)) return
    await fetch(`/api/admin/team?userId=${userId}`, { method: 'DELETE' })
    load()
  }

  const roleLabel = (role: string) =>
    role === 'super_admin' ? 'Super Admin' : 'Admin'

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <div className="mb-10">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-1">Admin</p>
        <h1 className="font-display text-3xl text-ivory" style={{ fontWeight: 300 }}>Team</h1>
        <p className="font-body text-ivory/30 text-sm mt-1">
          Only super admins can manage team access.
        </p>
      </div>

      {/* Invite form */}
      <div className="rounded-2xl p-6 mb-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="font-body text-sm text-ivory/60 mb-4">Add a team member</p>
        <form onSubmit={invite} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            required
            className="flex-1 bg-white/5 border border-white/10 focus:border-gold/40 text-ivory font-body text-sm px-4 py-2.5 rounded-xl outline-none transition-colors placeholder:text-ivory/20"
          />
          <button
            type="submit"
            disabled={adding || !email.trim()}
            className="font-body text-obsidian bg-gold hover:bg-gold-light disabled:opacity-40 text-xs tracking-widest uppercase px-5 py-2.5 rounded-xl transition-colors shrink-0"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
        {error   && <p className="font-body text-xs text-red-400 mt-3">{error}</p>}
        {success && <p className="font-body text-xs text-emerald-400 mt-3">✓ {success}</p>}
        <p className="font-body text-xs text-ivory/20 mt-3 leading-relaxed">
          The person must already have a Save The Day account. Adding them gives them access to the Admin portal immediately.
        </p>
      </div>

      {/* Team list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <p className="font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25">
            {members.length} team member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {loading ? (
          <div className="py-12 text-center font-body text-ivory/20 text-sm">Loading…</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center font-body text-ivory/20 text-sm">No team members yet</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="font-body text-sm text-ivory/75">{m.email}</p>
                  {m.full_name && <p className="font-body text-xs text-ivory/30 mt-0.5">{m.full_name}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-body text-xs ${m.role === 'super_admin' ? 'text-gold' : 'text-blue-400'}`}>
                    {roleLabel(m.role)}
                  </span>
                  {m.role !== 'super_admin' && (
                    <button
                      onClick={() => remove(m.id, m.email)}
                      className="font-body text-xs text-red-500/30 hover:text-red-400/70 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-5 rounded-2xl" style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}>
        <p className="font-body text-xs text-gold/60 leading-relaxed">
          <strong className="text-gold/80">Super Admin</strong> — can manage team members, access all admin features.<br />
          <strong className="text-blue-400/80">Admin</strong> — can view platform data, manage users and weddings, but cannot manage team access.<br />
          Super admin role must be set directly in the database.
        </p>
      </div>
    </div>
  )
}
