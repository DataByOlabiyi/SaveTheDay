'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { Wedding, Guest, GuestbookEntry } from '@/lib/db/types'
import { formatWeddingDate } from '@/lib/personalization/guest'
import { AddGuestModal } from './AddGuestModal'
import { ImportGuestsModal } from './ImportGuestsModal'
import { StoryEditor } from './StoryEditor'
import { GalleryManager } from './GalleryManager'
import { WeddingSettingsEditor } from './WeddingSettingsEditor'
import { AnalyticsPanel } from './AnalyticsPanel'
import { QRCodeModal } from '@/components/molecules/QRCodeModal'

interface AdminDashboardProps {
  wedding: Wedding
  guests: Guest[]
  adminSecret: string
}

type FilterStatus = 'all' | 'attending' | 'declined' | 'pending'
type ActiveTab    = 'guests' | 'guestbook' | 'story' | 'gallery' | 'settings' | 'analytics'

export function AdminDashboard({ wedding, guests: initialGuests, adminSecret }: AdminDashboardProps) {
  const router = useRouter()

  // ── Local guest state ──────────────────────────────────────────────────────
  // We keep our own copy so new guests appear instantly without waiting for
  // router.refresh() to propagate new server-component props.
  const [localGuests, setLocalGuests] = useState<Guest[]>(initialGuests)

  // When server-side props update (e.g. after router.refresh()), sync local state
  useEffect(() => { setLocalGuests(initialGuests) }, [initialGuests])

  // Fetch the full guest list from the API and update local state
  const refreshGuestList = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/guests?weddingId=${encodeURIComponent(wedding.id)}&secret=${encodeURIComponent(adminSecret)}`
      )
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.guests)) setLocalGuests(data.guests)
    } catch {
      // Silently fall back — list will update on next navigation
    }
  }, [wedding.id, adminSecret])

  const [activeTab, setActiveTab]   = useState<ActiveTab>('guests')
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<FilterStatus>('all')
  const [copied, setCopied]         = useState<string | null>(null)
  const [guestbook, setGuestbook]   = useState<GuestbookEntry[]>([])
  const [gbLoading, setGbLoading]   = useState(false)
  const [gbLoaded, setGbLoaded]     = useState(false)

  // Modals
  const [showAddGuest, setShowAddGuest]         = useState(false)
  const [showImportGuests, setShowImportGuests] = useState(false)
  const [successMessage, setSuccessMessage]     = useState<string | null>(null)
  const [showQRModal, setShowQRModal]           = useState(false)
  const [qrGuestSlug, setQrGuestSlug]           = useState<string | null>(null)

  const weddingDate = formatWeddingDate(wedding.wedding_date)

  const showBanner = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  // Single guest added — append immediately, no page reload needed
  const handleGuestAdded = useCallback((newGuest: Guest) => {
    setShowAddGuest(false)
    setLocalGuests(prev =>
      [...prev, newGuest].sort((a, b) => a.name.localeCompare(b.name))
    )
    showBanner('Guest added successfully')
  }, [])

  // Bulk import done — fetch fresh list since we don't have all new guest objects
  const handleImportDone = useCallback((count: number) => {
    setShowImportGuests(false)
    showBanner(`${count} guest${count !== 1 ? 's' : ''} imported`)
    refreshGuestList()
  }, [refreshGuestList])

  // Stats
  const stats = useMemo(() => {
    const attending = localGuests.filter(g => g.rsvp_status === 'attending').length
    const declined = localGuests.filter(g => g.rsvp_status === 'declined').length
    const pending = localGuests.filter(g => g.rsvp_status === 'pending').length
    const opened = localGuests.filter(g => g.opened_at).length
    const total = localGuests.length
    const openRate = total > 0 ? Math.round((opened / total) * 100) : 0
    const rsvpRate = total > 0 ? Math.round(((attending + declined) / total) * 100) : 0
    const totalSeats = localGuests
      .filter(g => g.rsvp_status === 'attending')
      .reduce((sum, g) => sum + (g.party_size ?? 1), 0)

    return { attending, declined, pending, opened, total, openRate, rsvpRate, totalSeats }
  }, [localGuests])

  // Filtered guests
  const filtered = useMemo(() => {
    return localGuests.filter(g => {
      const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (g.phone ?? '').includes(search)
      const matchFilter = filter === 'all' || g.rsvp_status === filter
      return matchSearch && matchFilter
    })
  }, [localGuests, search, filter])

  const appUrl = (typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL) ?? ''

  // Lazy-load guestbook entries the first time the tab is opened
  useEffect(() => {
    if (activeTab !== 'guestbook' || gbLoaded) return
    setGbLoading(true)
    fetch(`/api/guestbook?weddingId=${wedding.id}`)
      .then(r => r.json())
      .then(data => {
        setGuestbook(data.entries ?? [])
        setGbLoaded(true)
      })
      .catch(() => setGbLoaded(true))
      .finally(() => setGbLoading(false))
  }, [activeTab, gbLoaded, wedding.id])

  const copyLink = (guestSlug: string) => {
    const url = `${appUrl}/${wedding.slug}/${guestSlug}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(guestSlug)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const exportCSV = () => {
    const headers = ['Name', 'RSVP Status', 'Email', 'Phone', 'Opened', 'Party Size', 'Dietary', 'Note', 'Personal Link']
    const rows = filtered.map(g => [
      g.name,
      g.rsvp_status,
      g.email ?? '',
      g.phone ?? '',
      g.opened_at ? new Date(g.opened_at).toLocaleDateString('en-GB') : 'Not yet',
      String(g.party_size ?? 1),
      g.dietary ?? '',
      g.rsvp_note ?? '',
      `${appUrl}/${wedding.slug}/${g.slug}`,
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${wedding.slug}-guests-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#0F0F11] text-ivory font-body">

      {/* Modals */}
      {showAddGuest && (
        <AddGuestModal
          weddingId={wedding.id}
          adminSecret={adminSecret}
          onClose={() => setShowAddGuest(false)}
          onSuccess={handleGuestAdded}
        />
      )}
      {showImportGuests && (
        <ImportGuestsModal
          weddingId={wedding.id}
          adminSecret={adminSecret}
          onClose={() => setShowImportGuests(false)}
          onSuccess={handleImportDone}
        />
      )}

      {/* Success banner */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            key="success-banner"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 bg-green-900/80 border border-green-500/20 text-green-300 text-xs tracking-widest uppercase backdrop-blur-sm"
          >
            ✓ {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-white/5 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="font-display text-gold-gradient"
              style={{ fontSize: '1.5rem', fontWeight: 300, letterSpacing: '0.04em' }}
            >
              {wedding.couple_names.name1} & {wedding.couple_names.name2}
            </h1>
            <p className="text-ivory/35 text-xs tracking-wider mt-0.5">
              {weddingDate.full} · {wedding.city}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ivory/20 tracking-widest uppercase">Dashboard</p>
            <p className="text-xs text-gold-DEFAULT/50 font-mono mt-0.5">/{wedding.slug}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto mt-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {([
            { key: 'guests',    label: 'Guests',    count: localGuests.length },
            { key: 'guestbook', label: 'Guestbook', count: wedding.config.show_guestbook ? undefined : null },
            { key: 'story',     label: 'Story',     count: undefined },
            { key: 'gallery',   label: 'Gallery',   count: undefined },
            { key: 'analytics', label: 'Analytics', count: undefined },
            { key: 'settings',  label: 'Settings',  count: undefined },
          ] as const).map(tab => {
            if (tab.count === null) return null
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-1.5 text-xs tracking-widest uppercase transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'text-gold-DEFAULT border-gold-DEFAULT'
                    : 'text-ivory/30 border-transparent hover:text-ivory/50'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 opacity-50">({tab.count})</span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
      {/* QR Modal */}
      <AnimatePresence>
        {showQRModal && (
          <QRCodeModal
            url={qrGuestSlug
              ? `${appUrl}/${wedding.slug}/${qrGuestSlug}`
              : `${appUrl}/${wedding.slug}`
            }
            title="Share Invitation"
            subtitle={qrGuestSlug
              ? `Personal link for ${localGuests.find(g => g.slug === qrGuestSlug)?.name ?? 'guest'}`
              : `${wedding.couple_names.name1} & ${wedding.couple_names.name2}`
            }
            whatsappText={`You're invited to the wedding of ${wedding.couple_names.name1} & ${wedding.couple_names.name2}! Open your personal invitation: ${appUrl}/${wedding.slug}/${qrGuestSlug ?? ''}`}
            emailSubject={`You're invited — ${wedding.couple_names.name1} & ${wedding.couple_names.name2}`}
            emailBody={`Dear guest,\n\nYou are warmly invited to celebrate the wedding of ${wedding.couple_names.name1} & ${wedding.couple_names.name2}.\n\nOpen your invitation here:`}
            onClose={() => { setShowQRModal(false); setQrGuestSlug(null) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
      {activeTab === 'story' ? (
        <motion.div
          key="story"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-4">
            <h2 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Love Story Editor</h2>
            <p className="text-xs text-ivory/20">Add and edit the milestones that make up your story. They appear on the invitation page.</p>
          </div>
          <StoryEditor weddingId={wedding.id} adminSecret={adminSecret} />
        </motion.div>

      ) : activeTab === 'gallery' ? (
        <motion.div
          key="gallery"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-4">
            <h2 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Gallery Manager</h2>
            <p className="text-xs text-ivory/20">Upload photos, organise albums, and manage what guests can download.</p>
          </div>
          <GalleryManager weddingId={wedding.id} adminSecret={adminSecret} />
        </motion.div>

      ) : activeTab === 'analytics' ? (
        <motion.div
          key="analytics"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-4">
            <h2 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Analytics</h2>
            <p className="text-xs text-ivory/20">Guest engagement metrics for your wedding.</p>
          </div>
          <AnalyticsPanel weddingId={wedding.id} adminSecret={adminSecret} />
        </motion.div>

      ) : activeTab === 'settings' ? (
        <motion.div
          key="settings"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mb-4">
            <h2 className="text-xs tracking-widest uppercase text-ivory/30 mb-1">Wedding Settings</h2>
            <p className="text-xs text-ivory/20">Edit venue details, dress code, feature toggles and more.</p>
          </div>
          <WeddingSettingsEditor wedding={wedding} adminSecret={adminSecret} />
        </motion.div>

      ) : activeTab === 'guestbook' ? (
        <motion.div
          key="guestbook"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {gbLoading && (
            <div className="text-center py-20 text-ivory/20 text-sm tracking-wider">Loading messages…</div>
          )}
          {!gbLoading && guestbook.length === 0 && (
            <div className="text-center py-20 text-ivory/20 text-sm tracking-wider">No guestbook messages yet</div>
          )}
          {!gbLoading && guestbook.length > 0 && (
            <>
              <p className="text-xs text-ivory/25 tracking-widest uppercase mb-4">{guestbook.length} message{guestbook.length !== 1 ? 's' : ''}</p>
              {guestbook.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="admin-card p-5"
                >
                  <p className="font-display text-ivory/80 text-sm italic leading-relaxed mb-3">
                    &ldquo;{entry.message}&rdquo;
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-ivory/40 tracking-wider">— {entry.guest_name}</p>
                    <p className="text-xs text-ivory/20">
                      {new Date(entry.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="guests"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Attending', value: stats.attending, color: '#4ade80', sub: `${stats.totalSeats} seats` },
            { label: 'Declined', value: stats.declined, color: '#f87171', sub: undefined },
            { label: 'Awaiting', value: stats.pending, color: '#C9A84C', sub: undefined },
            { label: 'Total Guests', value: stats.total, color: '#C9A84C', sub: undefined },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="admin-card p-5"
            >
              <p className="text-xs tracking-widest uppercase text-ivory/30 mb-2">{stat.label}</p>
              <p
                className="font-display"
                style={{ fontSize: '2rem', fontWeight: 300, color: stat.color, lineHeight: 1 }}
              >
                {stat.value}
              </p>
              {stat.sub && (
                <p className="text-xs text-ivory/25 mt-1">{stat.sub}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Engagement metrics */}
        <div className="admin-card p-5">
          <h2 className="text-xs tracking-widest uppercase text-ivory/30 mb-4">Engagement</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-end justify-between mb-1.5">
                <p className="text-xs text-ivory/40">Open rate</p>
                <p className="text-sm text-ivory/70">{stats.opened}/{stats.total}</p>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.openRate}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #C9A84C, #E8CC7A)' }}
                />
              </div>
              <p className="text-xs text-gold-DEFAULT mt-1">{stats.openRate}%</p>
            </div>
            <div>
              <div className="flex items-end justify-between mb-1.5">
                <p className="text-xs text-ivory/40">RSVP rate</p>
                <p className="text-sm text-ivory/70">{stats.attending + stats.declined}/{stats.total}</p>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.rsvpRate}%` }}
                  transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #4ade80, #22c55e)' }}
                />
              </div>
              <p className="text-xs text-green-400 mt-1">{stats.rsvpRate}%</p>
            </div>
          </div>
        </div>

        {/* Guest list */}
        <div className="admin-card overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3">
            <input
              type="search"
              placeholder="Search guests..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 text-ivory text-sm px-3 py-2 placeholder-ivory/20 focus:outline-none focus:border-gold-DEFAULT/30"
            />
            <div className="flex gap-1 flex-wrap">
              {(['all', 'attending', 'declined', 'pending'] as FilterStatus[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs tracking-wider uppercase transition-colors ${
                    filter === f
                      ? 'bg-gold-DEFAULT/10 text-gold-DEFAULT border border-gold-DEFAULT/20'
                      : 'text-ivory/30 border border-white/5 hover:border-white/10'
                  }`}
                >
                  {f}
                </button>
              ))}

              {/* ── Add Guest ── */}
              <button
                onClick={() => setShowAddGuest(true)}
                title="Add a single guest"
                className="px-3 py-1.5 text-xs tracking-wider uppercase transition-colors text-gold-DEFAULT/70 border border-gold-DEFAULT/20 hover:border-gold-DEFAULT/40 hover:text-gold-DEFAULT flex items-center gap-1.5 bg-gold-DEFAULT/5"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add
              </button>

              {/* ── Import ── */}
              <button
                onClick={() => setShowImportGuests(true)}
                title="Import guests from CSV or Excel"
                className="px-3 py-1.5 text-xs tracking-wider uppercase transition-colors text-ivory/40 border border-white/10 hover:border-white/20 hover:text-ivory/70 flex items-center gap-1.5"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Import
              </button>

              {/* ── Export CSV ── */}
              <button
                onClick={exportCSV}
                title="Export visible guests to CSV"
                className="px-3 py-1.5 text-xs tracking-wider uppercase transition-colors text-ivory/30 border border-white/5 hover:border-white/10 hover:text-ivory/60 flex items-center gap-1.5"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-xs tracking-widest uppercase text-ivory/25 font-normal">Name</th>
                  <th className="text-left py-3 px-4 text-xs tracking-widest uppercase text-ivory/25 font-normal hidden sm:table-cell">Contact</th>
                  <th className="text-left py-3 px-4 text-xs tracking-widest uppercase text-ivory/25 font-normal">Status</th>
                  <th className="text-left py-3 px-4 text-xs tracking-widest uppercase text-ivory/25 font-normal hidden md:table-cell">Opened</th>
                  <th className="py-3 px-4 text-xs tracking-widest uppercase text-ivory/25 font-normal">Link</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-ivory/20 text-sm">
                      {localGuests.length === 0 ? (
                        <span>
                          No guests yet —{' '}
                          <button
                            onClick={() => setShowAddGuest(true)}
                            className="text-gold-DEFAULT/50 hover:text-gold-DEFAULT underline underline-offset-2 transition-colors"
                          >
                            add your first guest
                          </button>
                          {' '}or{' '}
                          <button
                            onClick={() => setShowImportGuests(true)}
                            className="text-gold-DEFAULT/50 hover:text-gold-DEFAULT underline underline-offset-2 transition-colors"
                          >
                            import a list
                          </button>
                        </span>
                      ) : 'No guests found'}
                    </td>
                  </tr>
                )}
                {filtered.map((guest, i) => (
                  <motion.tr
                    key={guest.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="text-sm text-ivory/80">{guest.name}</p>
                      {(guest.party_size ?? 1) > 1 && (
                        <p className="text-xs text-ivory/25 mt-0.5">+{(guest.party_size ?? 1) - 1}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <p className="text-xs text-ivory/35">{guest.email || guest.phone || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`
                        inline-block px-2 py-0.5 rounded-sm text-xs tracking-wider
                        ${guest.rsvp_status === 'attending' ? 'status-badge-attending' : ''}
                        ${guest.rsvp_status === 'declined' ? 'status-badge-declined' : ''}
                        ${guest.rsvp_status === 'pending' ? 'status-badge-pending' : ''}
                      `}>
                        {guest.rsvp_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className={`text-xs ${guest.opened_at ? 'text-green-400/60' : 'text-ivory/20'}`}>
                        {guest.opened_at
                          ? new Date(guest.opened_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          : 'Not yet'
                        }
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyLink(guest.slug)}
                          className="text-xs text-gold-DEFAULT/50 hover:text-gold-DEFAULT transition-colors"
                          title={`Copy link for ${guest.name}`}
                        >
                          {copied === guest.slug ? '✓' : 'Copy'}
                        </button>
                        <button
                          onClick={() => { setQrGuestSlug(guest.slug); setShowQRModal(true) }}
                          className="text-xs text-ivory/25 hover:text-ivory/60 transition-colors"
                          title={`Show QR code for ${guest.name}`}
                          aria-label={`Show QR code for ${guest.name}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                            <rect x="19" y="14" width="2" height="2"/><rect x="14" y="19" width="2" height="2"/>
                            <rect x="18" y="19" width="3" height="2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-ivory/20">
              {filtered.length} of {localGuests.length} guests
            </p>
            <p className="text-xs text-ivory/15">
              {stats.attending} attending · {stats.declined} declined · {stats.pending} pending
            </p>
          </div>
        </div>

        {/* Guest notes / dietary list */}
        {localGuests.some(g => g.dietary || g.rsvp_note) && (
          <div className="admin-card p-5">
            <h2 className="text-xs tracking-widest uppercase text-ivory/30 mb-4">
              Dietary Requirements & Notes
            </h2>
            <div className="space-y-3">
              {localGuests
                .filter(g => g.dietary || g.rsvp_note)
                .map(g => (
                  <div key={g.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm text-ivory/70">{g.name}</p>
                    {g.dietary && (
                      <p className="text-xs text-gold-DEFAULT/60 mt-0.5">🍽️ {g.dietary}</p>
                    )}
                    {g.rsvp_note && (
                      <p className="text-xs text-ivory/35 mt-0.5 italic">"{g.rsvp_note}"</p>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        </motion.div>
      )}
      </AnimatePresence>
      </main>
    </div>
  )
}
