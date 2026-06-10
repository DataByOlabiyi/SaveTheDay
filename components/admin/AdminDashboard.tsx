'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Wedding, Guest, GuestbookEntry } from '@/lib/db/types'
import { formatWeddingDate } from '@/lib/personalization/guest'
import { getTheme } from '@/lib/themes'
import { AddGuestModal } from './AddGuestModal'
import { ImportGuestsModal } from './ImportGuestsModal'
import { StoryEditor } from './StoryEditor'
import { GalleryManager } from './GalleryManager'
import { WeddingSettingsEditor } from './WeddingSettingsEditor'
import { AnalyticsPanel } from './AnalyticsPanel'
import { DashboardOverview } from './DashboardOverview'
import { ScheduleEditor } from './ScheduleEditor'
import { QRCodeModal } from '@/components/molecules/QRCodeModal'

// ── Types ──────────────────────────────────────────────────────────────────────

type Section = 'overview' | 'guests' | 'guestbook' | 'story' | 'gallery' | 'analytics' | 'settings' | 'invitations' | 'timeline' | 'reminders' | 'thankyou'
type FilterStatus = 'all' | 'attending' | 'declined' | 'pending'

// ── Confirm modal ──────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  confirmClassName,
  confirmStyle,
  onConfirm,
  onCancel,
  requireTyping,
}: {
  title: string
  description: string
  confirmLabel?: string
  confirmClassName?: string
  confirmStyle?: React.CSSProperties
  onConfirm: () => void
  onCancel: () => void
  requireTyping?: string
}) {
  const [typed, setTyped] = React.useState('')
  const ready = requireTyping ? typed === requireTyping : true

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: '#1A1A1C', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <h2 className="font-display text-ivory/90 text-xl mb-2" style={{ fontWeight: 300 }}>{title}</h2>
        <p className="font-body text-ivory/40 text-sm leading-relaxed mb-5">{description}</p>

        {requireTyping && (
          <div className="mb-5">
            <p className="font-body text-xs text-ivory/30 mb-2 tracking-wide">
              Type <span className="text-red-400 font-mono">{requireTyping}</span> to confirm
            </p>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={requireTyping}
              className="w-full bg-white/5 border border-white/10 focus:border-red-500/40 text-ivory font-body text-sm px-4 py-2.5 rounded-lg outline-none transition-colors placeholder:text-ivory/15"
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 font-body text-xs tracking-widest uppercase px-4 py-2.5 rounded-lg border border-white/10 text-ivory/40 hover:text-ivory/70 hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!ready}
            className={`flex-1 font-body text-xs tracking-widest uppercase px-4 py-2.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${confirmClassName ?? 'bg-red-500/80 hover:bg-red-500 text-white'}`}
            style={confirmStyle}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

interface AdminDashboardProps {
  wedding:               Wedding
  guests:                Guest[]
  userEmail?:            string
  galleryPhotoCount?:    number
  storyMilestoneCount?:  number
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function Icon({ paths, className = '' }: { paths: string[]; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-4 h-4 shrink-0 ${className}`}
      aria-hidden
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

const ICONS = {
  overview:     ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  guests:       ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
  guestbook:    ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'],
  story:        ['M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'],
  gallery:      ['M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z', 'M12 17a4 4 0 100-8 4 4 0 000 8'],
  analytics:    ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  settings:     ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z'],
  invitations:  ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'],
  timeline:     ['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
  reminders:    ['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 01-3.46 0'],
  thankyou:     ['M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'],
  logout:       ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  menu:         ['M3 12h18', 'M3 6h18', 'M3 18h18'],
  chevronLeft:  ['M15 18l-6-6 6-6'],
  chevronRight: ['M9 18l6-6-6-6'],
  x:            ['M18 6L6 18', 'M6 6l12 12'],
  externalLink: ['M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6', 'M15 3h6v6', 'M10 14L21 3'],
  copy:         ['M8 17H5a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v3', 'M19 21H9a2 2 0 01-2-2V9a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2z'],
  qr:           ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 17h.01', 'M17 14h.01', 'M14 14h.01', 'M20 17h.01', 'M17 20h.01', 'M20 20h.01'],
  download:     ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  upload:       ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  plus:         ['M12 5v14M5 12h14'],
  lock:         ['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4'],
  search:       ['M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0'],
}

// ── Nav config ─────────────────────────────────────────────────────────────────

const NAV_GROUPS: Array<{ label: string; items: { id: Section; label: string }[] }> = [
  {
    label: '',
    items: [{ id: 'overview', label: 'Overview' }],
  },
  {
    label: 'Your Invitation',
    items: [
      { id: 'story',    label: 'Our Story' },
      { id: 'gallery',  label: 'Gallery' },
      { id: 'timeline', label: 'Programme' },
      { id: 'settings', label: 'Settings' },
    ],
  },
  {
    label: 'Your Guests',
    items: [
      { id: 'guests',      label: 'Guests' },
      { id: 'invitations', label: 'Print Card' },
      { id: 'guestbook',   label: 'Guestbook' },
      { id: 'reminders',   label: 'Reminders' },
      { id: 'thankyou',    label: 'Thank You' },
    ],
  },
  {
    label: 'Insights',
    items: [{ id: 'analytics', label: 'Analytics' }],
  },
]

const COMING_SOON: { id: Section; label: string }[] = []

// ── Sidebar nav item ───────────────────────────────────────────────────────────

function NavItem({
  id, label, isActive, collapsed, badge, onClick, themeAccent, themeRaw,
}: {
  id: Section
  label: string
  isActive: boolean
  collapsed: boolean
  badge?: number
  onClick: () => void
  themeAccent: string
  themeRaw: string
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`
        relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left
        ${isActive ? '' : 'text-ivory/40 hover:text-ivory/70 hover:bg-white/[0.04]'}
      `}
      style={isActive ? {
        color: themeAccent,
        background: `rgba(${themeRaw}, 0.08)`,
      } : {}}
    >
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
          style={{ background: themeAccent }}
        />
      )}
      <Icon paths={ICONS[id] ?? ICONS.overview} />
      {!collapsed && (
        <>
          <span className="font-body text-sm tracking-wide flex-1">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span
              className="font-body text-[10px] px-1.5 py-0.5 rounded-full leading-none"
              style={{ color: themeAccent, background: `rgba(${themeRaw}, 0.12)` }}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
      {collapsed && badge !== undefined && badge > 0 && (
        <span
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
          style={{ background: themeAccent }}
        />
      )}
    </button>
  )
}

// ── Sidebar content (shared between desktop + mobile) ──────────────────────────

function SidebarContent({
  wedding,
  activeSection,
  collapsed,
  guestCount,
  showGuestbook,
  userEmail,
  themeAccent,
  themeRaw,
  onNavigate,
  onLogout,
  onClose,
}: {
  wedding: Wedding
  activeSection: Section
  collapsed: boolean
  guestCount: number
  showGuestbook: boolean
  userEmail?: string
  themeAccent: string
  themeRaw: string
  onNavigate: (s: Section) => void
  onLogout: () => void
  onClose?: () => void
}) {
  const initial = userEmail?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center h-14 px-4 border-b border-white/[0.05] shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        {onClose && (
          <button onClick={onClose} className="mr-1 text-ivory/30 hover:text-ivory/60 transition-colors">
            <Icon paths={ICONS.x} />
          </button>
        )}
        <span className="font-display text-gold text-xl italic tracking-wide">
          {collapsed ? 'S' : 'Save The Day'}
        </span>
      </div>

      {/* Couple name */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-white/[0.05] shrink-0">
          <p className="font-display text-ivory/90 text-sm italic truncate">
            {wedding.couple_names.name1} &amp; {wedding.couple_names.name2}
          </p>
          <p className="font-body text-ivory/25 text-xs mt-0.5 truncate">
            {new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
            {!collapsed && group.label && (
              <p className="font-body text-[10px] tracking-[0.2em] uppercase text-ivory/20 px-3 pb-1.5 pt-1">
                {group.label}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div className="my-2 border-t border-white/[0.05]" />
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                if (item.id === 'guestbook' && !showGuestbook) return null
                return (
                  <NavItem
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    isActive={activeSection === item.id}
                    collapsed={collapsed}
                    badge={item.id === 'guests' ? guestCount : undefined}
                    onClick={() => { onNavigate(item.id); onClose?.() }}
                    themeAccent={themeAccent}
                    themeRaw={themeRaw}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {COMING_SOON.length > 0 && (
          <>
            <div className="my-3 border-t border-white/[0.05]" />
            {!collapsed && (
              <p className="font-body text-[10px] tracking-[0.2em] uppercase text-ivory/20 px-3 pb-1">Coming soon</p>
            )}
            {COMING_SOON.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-40 cursor-not-allowed"
              >
                <Icon paths={ICONS[item.id] ?? ICONS.lock} />
                {!collapsed && (
                  <>
                    <span className="font-body text-sm tracking-wide text-ivory/40 flex-1">{item.label}</span>
                    <Icon paths={ICONS.lock} className="w-3 h-3 text-ivory/20" />
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </nav>

      {/* User / logout */}
      <div className="shrink-0 px-2 py-3 border-t border-white/[0.05]">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <Link href="/account" title="Account settings">
              <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 hover:bg-gold/20 transition-colors">
                <span className="font-body text-gold text-xs">{initial}</span>
              </div>
            </Link>
            <Link href="/account" className="font-body text-xs text-ivory/35 hover:text-ivory/60 truncate flex-1 min-w-0 transition-colors">
              {userEmail ?? 'Account'}
            </Link>
            <button
              onClick={onLogout}
              title="Sign out"
              className="text-ivory/25 hover:text-ivory/60 transition-colors"
            >
              <Icon paths={ICONS.logout} />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            title="Sign out"
            className="w-full flex items-center justify-center py-2 text-ivory/25 hover:text-ivory/60 transition-colors"
          >
            <Icon paths={ICONS.logout} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Section heading ────────────────────────────────────────────────────────────

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-xl text-ivory/80" style={{ fontWeight: 300 }}>{title}</h2>
      {description && <p className="font-body text-xs text-ivory/30 mt-1">{description}</p>}
    </div>
  )
}

// ── Coming-soon stub ───────────────────────────────────────────────────────────

function ComingSoonSection({ label }: { label: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 rounded-2xl text-center"
      style={{ border: '1px dashed rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.12)' }}
      >
        <Icon paths={ICONS.lock} className="text-gold/60" />
      </div>
      <p className="font-display text-xl text-ivory/40 italic mb-2" style={{ fontWeight: 300 }}>{label}</p>
      <p className="font-body text-xs text-ivory/20 max-w-xs leading-relaxed">
        This feature is coming soon. We&apos;re building it — check back later.
      </p>
    </div>
  )
}

// ── Reminders section ─────────────────────────────────────────────────────────

function RemindersSection({ wedding, guests, appUrl }: { wedding: Wedding; guests: Guest[]; appUrl: string }) {
  const pending = guests.filter(g => g.rsvp_status === 'pending')
  const [selected, setSelected] = React.useState<Set<string>>(new Set(pending.map(g => g.id)))
  const [message, setMessage]   = React.useState('')
  const [sending, setSending]   = React.useState(false)
  const [result, setResult]     = React.useState<{ links: { guestName: string; phone?: string; waLink: string }[] } | null>(null)

  const toggleGuest = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const sendReminders = async () => {
    if (!selected.size) return
    setSending(true)
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding.id, guestIds: [...selected], message: message || undefined }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
    } finally { setSending(false) }
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Send Reminders"
        description="Nudge guests who haven't RSVP'd yet. Opens WhatsApp with a pre-filled message for each guest."
      />

      {pending.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl text-center"
          style={{ border: '1px dashed rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}
        >
          <p className="font-display text-xl text-ivory/30 italic mb-1" style={{ fontWeight: 300 }}>All caught up</p>
          <p className="font-body text-xs text-ivory/20 max-w-xs">No guests with pending RSVPs.</p>
        </div>
      ) : (
        <>
          {/* Message */}
          <div className="admin-card p-5">
            <label className="rsvp-label mb-2 block">Custom message (optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={`Hi [name]! Just a reminder — you haven't RSVP'd yet for ${wedding.couple_names.name1} & ${wedding.couple_names.name2}'s wedding.`}
              className="rsvp-input resize-none w-full"
            />
            <p className="text-xs text-ivory/20 mt-1">{message.length}/500</p>
          </div>

          {/* Guest checklist */}
          <div className="admin-card overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
              <p className="font-body text-xs tracking-[0.2em] uppercase text-ivory/30">{pending.length} pending</p>
              <button
                onClick={() => setSelected(selected.size === pending.length ? new Set() : new Set(pending.map(g => g.id)))}
                className="font-body text-xs text-gold/60 hover:text-gold transition-colors"
              >
                {selected.size === pending.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {pending.map(g => (
                <div
                  key={g.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => toggleGuest(g.id)}
                >
                  <div className={`w-4 h-4 rounded border transition-all flex-shrink-0 flex items-center justify-center ${selected.has(g.id) ? 'bg-emerald-DEFAULT border-emerald-DEFAULT' : 'border-white/20'}`}>
                    {selected.has(g.id) && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-ivory/80">{g.name}</p>
                    {g.phone && <p className="font-body text-xs text-ivory/30">{g.phone}</p>}
                  </div>
                  {g.reminder_sent_at && (
                    <span className="font-body text-xs text-ivory/20 flex-shrink-0">
                      Sent {new Date(g.reminder_sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {result ? (
            <div className="space-y-3">
              <p className="font-body text-xs tracking-[0.2em] uppercase text-emerald-DEFAULT/60">
                ✓ Open each link to send via WhatsApp
              </p>
              {result.links.map((l, i) => (
                <div key={i} className="flex items-center gap-3 admin-card p-4">
                  <p className="flex-1 font-body text-sm text-ivory/70">{l.guestName}</p>
                  {l.phone ? (
                    <a
                      href={l.waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-xs text-emerald-DEFAULT/70 hover:text-emerald-DEFAULT transition-colors flex items-center gap-1.5"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.859L.058 23.617a.5.5 0 00.61.637l5.939-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.505-5.25-1.385l-.378-.214-3.527.921.937-3.451-.233-.384A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                      Send WhatsApp
                    </a>
                  ) : (
                    <span className="font-body text-xs text-ivory/20">No phone number</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <motion.button
              onClick={sendReminders}
              disabled={sending || !selected.size}
              className="btn-gold w-full py-3.5 disabled:opacity-40"
              whileTap={{ scale: 0.98 }}
            >
              {sending ? 'Preparing…' : `Send Reminders to ${selected.size} Guest${selected.size !== 1 ? 's' : ''}`}
            </motion.button>
          )}
        </>
      )}
    </div>
  )
}

// ── Thank You section ──────────────────────────────────────────────────────────

function ThankYouSection({ wedding, guests, appUrl }: { wedding: Wedding; guests: Guest[]; appUrl: string }) {
  const [message, setMessage]     = React.useState(`Thank you so much for celebrating with us! Your presence made our day truly special. We're so grateful to have you in our lives.`)
  const [galleryUrl, setGalleryUrl] = React.useState('')
  const [sending, setSending]     = React.useState(false)
  const [result, setResult]       = React.useState<{ links: { guestName: string; phone?: string; waLink: string }[] } | null>(null)

  const attending = guests.filter(g => g.rsvp_status === 'attending')

  const send = async () => {
    setSending(true)
    try {
      const res = await fetch('/api/thankyou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId: wedding.id,
          message,
          galleryUrl: galleryUrl || undefined,
          targetAll: true,
        }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
    } finally { setSending(false) }
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Thank You Message"
        description="Send a heartfelt thank-you to all your guests after the wedding."
      />

      <div className="admin-card p-5 space-y-4">
        <div>
          <label className="rsvp-label mb-2 block">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            maxLength={1000}
            className="rsvp-input resize-none w-full"
          />
          <p className="text-xs text-ivory/20 mt-1">{message.length}/1000</p>
        </div>
        <div>
          <label className="rsvp-label mb-1 block">Gallery link (optional)</label>
          <input
            type="url"
            value={galleryUrl}
            onChange={e => setGalleryUrl(e.target.value)}
            placeholder={`${appUrl}/e/${wedding.slug}`}
            className="rsvp-input"
          />
          <p className="text-[11px] text-ivory/20 mt-1">Include a link to your wedding photos or gallery</p>
        </div>
      </div>

      <div
        className="rounded-2xl px-5 py-3"
        style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}
      >
        <p className="font-body text-xs text-gold/60">
          Will be sent to <strong className="text-gold/80">{guests.length} guest{guests.length !== 1 ? 's' : ''}</strong>
          {attending.length > 0 && ` (${attending.length} attended)`}
        </p>
      </div>

      {result ? (
        <div className="space-y-3">
          <p className="font-body text-xs tracking-[0.2em] uppercase text-emerald-DEFAULT/60">
            ✓ Open each link to send via WhatsApp
          </p>
          {result.links.slice(0, 20).map((l, i) => (
            <div key={i} className="flex items-center gap-3 admin-card p-4">
              <p className="flex-1 font-body text-sm text-ivory/70">{l.guestName}</p>
              {l.phone ? (
                <a
                  href={l.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-xs text-emerald-DEFAULT/70 hover:text-emerald-DEFAULT transition-colors flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.859L.058 23.617a.5.5 0 00.61.637l5.939-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.505-5.25-1.385l-.378-.214-3.527.921.937-3.451-.233-.384A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  Send
                </a>
              ) : (
                <span className="font-body text-xs text-ivory/20">No phone</span>
              )}
            </div>
          ))}
          {result.links.length > 20 && (
            <p className="font-body text-xs text-ivory/25 text-center">
              + {result.links.length - 20} more guests — email sent automatically
            </p>
          )}
        </div>
      ) : (
        <motion.button
          onClick={send}
          disabled={sending || !message.trim()}
          className="btn-gold w-full py-3.5 disabled:opacity-40"
          whileTap={{ scale: 0.98 }}
        >
          {sending ? 'Preparing…' : `Send Thank You to ${guests.length} Guest${guests.length !== 1 ? 's' : ''}`}
        </motion.button>
      )}
    </div>
  )
}

// ── Invitation Card section ────────────────────────────────────────────────────

function InvitationCardSection({ wedding, appUrl }: { wedding: Wedding; appUrl: string }) {
  const [downloading, setDownloading] = React.useState(false)
  const [template, setTemplate]       = React.useState<'classic' | 'royal'>('classic')
  const cardRef    = React.useRef<HTMLDivElement>(null)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  // Scale the 560px card to fit the available container width on mobile
  React.useEffect(() => {
    const wrapper = wrapperRef.current
    const card    = cardRef.current
    if (!wrapper || !card) return
    const scale = Math.min(1, wrapper.clientWidth / 560)
    card.style.transform       = `scale(${scale})`
    card.style.transformOrigin = 'top center'
    wrapper.style.height       = `${card.scrollHeight * scale}px`
  }, [template])

  const inviteUrl   = `${appUrl}/e/${wedding.slug}`
  const initials    = `${wedding.couple_names.name1[0] ?? ''}${wedding.couple_names.name2[0] ?? ''}`
  const weddingDate = new Date(wedding.wedding_date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const isClassic = template === 'classic'

  const qrColor   = isClassic ? '3D1F0A' : 'C9A84C'
  const qrBg      = isClassic ? 'FAF7F0' : '0D1B3E'
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&color=${qrColor}&bgcolor=${qrBg}&data=${encodeURIComponent(inviteUrl)}`
  const bgColor   = isClassic ? '#FAF7F0' : '#0D1B3E'

  const downloadCard = async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: bgColor,
        logging: false,
      })
      const link    = document.createElement('a')
      link.download = `${wedding.slug}-invitation-${template}.png`
      link.href     = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally { setDownloading(false) }
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Print Invitation Card"
        description="Generate a printable card with a QR code that links to your digital invitation. Perfect for physical stationery."
      />

      {/* Template picker */}
      <div className="admin-card p-5">
        <p className="text-xs tracking-widest uppercase text-ivory/30 mb-4">Template</p>
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: 'classic', label: 'Classic', desc: 'Cream & warm tones, floral border' },
            { id: 'royal',   label: 'Royal',   desc: 'Navy & gold, monogram crest' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={`p-4 rounded-xl text-left transition-all ${
                template === t.id
                  ? 'ring-2 ring-gold/40'
                  : 'hover:bg-white/[0.03] border border-white/[0.07]'
              }`}
              style={template === t.id ? { background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)' } : {}}
            >
              <p className="font-body text-sm text-ivory/80 mb-0.5">{t.label}</p>
              <p className="font-body text-xs text-ivory/30">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Card preview */}
      <div className="admin-card p-5">
        <p className="text-xs tracking-widest uppercase text-ivory/30 mb-4">Preview</p>
        <div ref={wrapperRef} className="overflow-hidden w-full relative">
          {isClassic ? (
            /* ── CLASSIC ── cream/warm white, serif, SVG corner flourishes ── */
            <div
              ref={cardRef}
              style={{
                width: 560,
                background: '#FAF7F0',
                padding: '52px 60px',
                fontFamily: 'Georgia, "Times New Roman", serif',
                position: 'relative',
                margin: '0 auto',
                boxSizing: 'border-box',
              }}
            >
              {/* Outer border */}
              <div style={{ position: 'absolute', inset: 14, border: '1.5px solid rgba(160,110,60,0.25)', pointerEvents: 'none' }} />
              {/* Inner hairline */}
              <div style={{ position: 'absolute', inset: 20, border: '0.5px solid rgba(160,110,60,0.12)', pointerEvents: 'none' }} />

              {/* SVG corner flourishes */}
              {[
                { top: 6, left: 6 },
                { top: 6, right: 6, transform: 'scaleX(-1)' },
                { bottom: 6, left: 6, transform: 'scaleY(-1)' },
                { bottom: 6, right: 6, transform: 'scale(-1,-1)' },
              ].map((pos, i) => (
                <svg key={i} width="38" height="38" viewBox="0 0 38 38" fill="none"
                  style={{ position: 'absolute', ...pos, pointerEvents: 'none' }}>
                  <path d="M2 36 C2 20 2 2 20 2" stroke="rgba(160,110,60,0.35)" strokeWidth="1" fill="none"/>
                  <path d="M2 36 C8 30 14 24 20 18" stroke="rgba(160,110,60,0.2)" strokeWidth="0.75" fill="none"/>
                  <circle cx="2" cy="36" r="1.5" fill="rgba(160,110,60,0.4)"/>
                  <circle cx="20" cy="2" r="1.5" fill="rgba(160,110,60,0.4)"/>
                  <path d="M6 30 Q10 22 18 6" stroke="rgba(160,110,60,0.15)" strokeWidth="0.5" fill="none"/>
                </svg>
              ))}

              {/* Top label */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <p style={{ color: 'rgba(100,70,30,0.45)', fontSize: 9, letterSpacing: '0.4em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
                  Together with their families
                </p>
              </div>

              {/* Names */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <p style={{ color: '#2C1A0A', fontSize: 38, fontWeight: 400, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 1.15, margin: 0 }}>
                  {wedding.couple_names.name1}
                </p>
                {/* Ampersand flourish */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '10px 0' }}>
                  <div style={{ flex: 1, maxWidth: 80, height: 1, background: 'linear-gradient(to right, transparent, rgba(160,110,60,0.4))' }} />
                  <p style={{ color: 'rgba(140,90,40,0.7)', fontSize: 26, fontStyle: 'italic', margin: 0, lineHeight: 1 }}>&amp;</p>
                  <div style={{ flex: 1, maxWidth: 80, height: 1, background: 'linear-gradient(to left, transparent, rgba(160,110,60,0.4))' }} />
                </div>
                <p style={{ color: '#2C1A0A', fontSize: 38, fontWeight: 400, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 1.15, margin: 0 }}>
                  {wedding.couple_names.name2}
                </p>
              </div>

              {/* Ornamental divider */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '20px auto 24px' }}>
                <div style={{ height: 1, width: 60, background: 'rgba(160,110,60,0.3)' }} />
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1 L8.5 5.5 L13 7 L8.5 8.5 L7 13 L5.5 8.5 L1 7 L5.5 5.5 Z" fill="rgba(160,110,60,0.5)"/>
                </svg>
                <div style={{ height: 1, width: 60, background: 'rgba(160,110,60,0.3)' }} />
              </div>

              {/* Date + Venue */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <p style={{ color: '#3D1F0A', fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', marginBottom: 6, fontWeight: 500 }}>
                  {weddingDate}
                </p>
                <p style={{ color: 'rgba(44,26,10,0.6)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
                  {wedding.venue}
                </p>
                {wedding.city && (
                  <p style={{ color: 'rgba(44,26,10,0.4)', fontSize: 10, fontFamily: 'system-ui, sans-serif', marginTop: 3, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    {wedding.city}
                  </p>
                )}
              </div>

              {/* QR */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, border: '1px solid rgba(160,110,60,0.2)', background: '#FBF9F4' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR code" width={88} height={88} crossOrigin="anonymous" style={{ display: 'block', imageRendering: 'pixelated' }} />
                </div>
                <p style={{ color: 'rgba(44,26,10,0.35)', fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
                  Scan to view digital invitation
                </p>
              </div>
            </div>
          ) : (
            /* ── ROYAL ── deep navy, gold, botanical leaves, monogram ── */
            <div
              ref={cardRef}
              style={{
                width: 560,
                background: '#0D1B3E',
                padding: '52px 60px',
                fontFamily: 'Georgia, "Times New Roman", serif',
                position: 'relative',
                margin: '0 auto',
                boxSizing: 'border-box',
              }}
            >
              {/* Gold border */}
              <div style={{ position: 'absolute', inset: 10, border: '1.5px solid rgba(201,168,76,0.55)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: 16, border: '0.5px solid rgba(201,168,76,0.2)', pointerEvents: 'none' }} />

              {/* Botanical SVG leaves — top-left */}
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none"
                style={{ position: 'absolute', top: 18, left: 18, opacity: 0.35, pointerEvents: 'none' }}>
                <path d="M10 70 C10 50 30 30 50 10" stroke="#C9A84C" strokeWidth="1.2" fill="none"/>
                <path d="M10 70 Q20 40 50 10 Q30 35 10 70Z" fill="rgba(201,168,76,0.18)"/>
                <path d="M18 62 C25 48 38 34 54 18" stroke="#C9A84C" strokeWidth="0.6" fill="none"/>
                <ellipse cx="30" cy="48" rx="10" ry="5" fill="rgba(201,168,76,0.12)" transform="rotate(-45 30 48)"/>
                <ellipse cx="42" cy="34" rx="8" ry="4" fill="rgba(201,168,76,0.1)" transform="rotate(-45 42 34)"/>
              </svg>

              {/* Botanical SVG leaves — bottom-right (mirrored) */}
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none"
                style={{ position: 'absolute', bottom: 18, right: 18, opacity: 0.35, pointerEvents: 'none', transform: 'rotate(180deg)' }}>
                <path d="M10 70 C10 50 30 30 50 10" stroke="#C9A84C" strokeWidth="1.2" fill="none"/>
                <path d="M10 70 Q20 40 50 10 Q30 35 10 70Z" fill="rgba(201,168,76,0.18)"/>
                <path d="M18 62 C25 48 38 34 54 18" stroke="#C9A84C" strokeWidth="0.6" fill="none"/>
                <ellipse cx="30" cy="48" rx="10" ry="5" fill="rgba(201,168,76,0.12)" transform="rotate(-45 30 48)"/>
                <ellipse cx="42" cy="34" rx="8" ry="4" fill="rgba(201,168,76,0.1)" transform="rotate(-45 42 34)"/>
              </svg>

              {/* Monogram crest */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 56, height: 56, borderRadius: '50%',
                  border: '1.5px solid rgba(201,168,76,0.5)',
                  background: 'rgba(201,168,76,0.06)',
                  color: '#C9A84C', fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.02em',
                }}>
                  {initials}
                </div>
              </div>

              {/* Names */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <p style={{ color: '#F0E6C8', fontSize: 36, fontWeight: 400, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 1.2, margin: 0 }}>
                  {wedding.couple_names.name1}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '10px 0' }}>
                  <div style={{ flex: 1, maxWidth: 80, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5))' }} />
                  <p style={{ color: '#C9A84C', fontSize: 24, fontStyle: 'italic', margin: 0, lineHeight: 1 }}>&amp;</p>
                  <div style={{ flex: 1, maxWidth: 80, height: 1, background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.5))' }} />
                </div>
                <p style={{ color: '#F0E6C8', fontSize: 36, fontWeight: 400, fontStyle: 'italic', letterSpacing: '0.02em', lineHeight: 1.2, margin: 0 }}>
                  {wedding.couple_names.name2}
                </p>
              </div>

              {/* Gold ornamental divider */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '20px auto 24px' }}>
                <div style={{ height: 1, width: 60, background: 'rgba(201,168,76,0.4)' }} />
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 0.5 L7.2 4.2 L11 6 L7.2 7.8 L6 11.5 L4.8 7.8 L1 6 L4.8 4.2 Z" fill="#C9A84C" opacity="0.8"/>
                </svg>
                <div style={{ height: 1, width: 60, background: 'rgba(201,168,76,0.4)' }} />
              </div>

              {/* Date + Venue */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <p style={{ color: '#C9A84C', fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', marginBottom: 6 }}>
                  {weddingDate}
                </p>
                <p style={{ color: 'rgba(240,230,200,0.65)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
                  {wedding.venue}
                </p>
                {wedding.city && (
                  <p style={{ color: 'rgba(201,168,76,0.4)', fontSize: 10, fontFamily: 'system-ui, sans-serif', marginTop: 3, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    {wedding.city}
                  </p>
                )}
              </div>

              {/* QR */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.04)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR code" width={88} height={88} crossOrigin="anonymous" style={{ display: 'block', imageRendering: 'pixelated' }} />
                </div>
                <p style={{ color: 'rgba(201,168,76,0.4)', fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
                  Scan to view digital invitation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Download button */}
      <motion.button
        onClick={downloadCard}
        disabled={downloading}
        className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-40"
        whileTap={{ scale: 0.98 }}
      >
        {downloading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Generating…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Download Card (PNG)
          </>
        )}
      </motion.button>

      <p className="font-body text-xs text-ivory/20 text-center leading-relaxed">
        Download as a high-resolution PNG. Print and attach the QR code to your physical invitations, Aso-ebi cards, or stationery.
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AdminDashboard({ wedding, guests: initialGuests, userEmail, galleryPhotoCount = 0, storyMilestoneCount = 0 }: AdminDashboardProps) {
  const router = useRouter()
  const invTheme = getTheme(wedding.config.invitation_theme)

  // ── Guest state ──────────────────────────────────────────────────────────────
  const [localGuests, setLocalGuests] = useState<Guest[]>(initialGuests)
  useEffect(() => { setLocalGuests(initialGuests) }, [initialGuests])

  // ── Story state (tracks count for setup progress) ────────────────────────────
  const [localStoryCount, setLocalStoryCount] = useState(storyMilestoneCount)

  const refreshGuestList = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/guests?weddingId=${encodeURIComponent(wedding.id)}`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.guests)) setLocalGuests(data.guests)
    } catch { /* silent fallback */ }
  }, [wedding.id])

  // ── Layout state ─────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // ── Guest list state ─────────────────────────────────────────────────────────
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<FilterStatus>('all')
  const [copied, setCopied]   = useState<string | null>(null)

  // ── Guestbook state ──────────────────────────────────────────────────────────
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([])
  const [gbLoading, setGbLoading] = useState(false)
  const [gbLoaded, setGbLoaded]   = useState(false)

  useEffect(() => {
    if (activeSection !== 'guestbook' || gbLoaded) return
    setGbLoading(true)
    fetch(`/api/guestbook?weddingId=${wedding.id}`)
      .then(r => r.json())
      .then(data => { setGuestbook(data.entries ?? []); setGbLoaded(true) })
      .catch(() => setGbLoaded(true))
      .finally(() => setGbLoading(false))
  }, [activeSection, gbLoaded, wedding.id])

  // ── Preview as guest ─────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false)

  // ── Modals ───────────────────────────────────────────────────────────────────
  const [showAddGuest, setShowAddGuest]         = useState(false)
  const [showImportGuests, setShowImportGuests] = useState(false)
  const [showQRModal, setShowQRModal]           = useState(false)
  const [qrGuestSlug, setQrGuestSlug]           = useState<string | null>(null)
  const [successMessage, setSuccessMessage]     = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal]   = useState(false)

  const showBanner = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  const handleGuestAdded = useCallback((newGuest: Guest) => {
    setShowAddGuest(false)
    setLocalGuests(prev => [...prev, newGuest].sort((a, b) => a.name.localeCompare(b.name)))
    showBanner('Guest added successfully')
  }, [])

  const handleImportDone = useCallback((count: number) => {
    setShowImportGuests(false)
    showBanner(`${count} guest${count !== 1 ? 's' : ''} imported`)
    refreshGuestList()
  }, [refreshGuestList])

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const attending = localGuests.filter(g => g.rsvp_status === 'attending').length
    const declined  = localGuests.filter(g => g.rsvp_status === 'declined').length
    const pending   = localGuests.filter(g => g.rsvp_status === 'pending').length
    const opened    = localGuests.filter(g => g.opened_at).length
    const total     = localGuests.length
    const openRate  = total > 0 ? Math.round((opened / total) * 100) : 0
    const rsvpRate  = total > 0 ? Math.round(((attending + declined) / total) * 100) : 0
    const totalSeats = localGuests
      .filter(g => g.rsvp_status === 'attending')
      .reduce((sum, g) => sum + (g.party_size ?? 1), 0)
    return { attending, declined, pending, opened, total, openRate, rsvpRate, totalSeats }
  }, [localGuests])

  // ── Setup checklist ──────────────────────────────────────────────────────────
  const setupChecklist = useMemo(() => [
    { id: 'basics', label: 'Wedding details',      done: !!(wedding.venue && wedding.wedding_date && wedding.couple_names.name1) },
    { id: 'story',  label: 'Couple story',         done: localStoryCount > 0 || !!(wedding.config.intro_text) },
    { id: 'media',  label: 'Cover photo or video', done: !!(wedding.config.montage_images?.length || wedding.config.intro_video_url || galleryPhotoCount > 0) },
    { id: 'guests', label: 'Guest list',            done: localGuests.length > 0 },
  ], [wedding, localGuests.length, galleryPhotoCount, localStoryCount])

  const setupPercent = useMemo(() => {
    const done = setupChecklist.filter(c => c.done).length
    return Math.round((done / setupChecklist.length) * 100)
  }, [setupChecklist])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => localGuests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (g.phone ?? '').includes(search)
    const matchFilter = filter === 'all' || g.rsvp_status === filter
    return matchSearch && matchFilter
  }), [localGuests, search, filter])

  const appUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? '')

  const weddingDate = formatWeddingDate(wedding.wedding_date)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const deleteWedding = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/wedding?weddingId=${encodeURIComponent(wedding.id)}`, { method: 'DELETE' })
      if (res.ok) router.push('/studio')
    } catch { /* silent */ }
  }, [wedding.id, router])

  const whatsappLink = (guestSlug: string, guestName: string) => {
    const url  = `${appUrl}/e/${wedding.slug}/${guestSlug}`
    const text = `Hi ${guestName}! You're invited to the wedding of ${wedding.couple_names.name1} & ${wedding.couple_names.name2}. Open your personal invitation here: ${url}`
    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  const deleteGuest = useCallback(async (guestId: string, guestName: string) => {
    if (!confirm(`Remove ${guestName} from the guest list?`)) return
    try {
      const res = await fetch(
        `/api/admin/guests?weddingId=${encodeURIComponent(wedding.id)}&guestId=${encodeURIComponent(guestId)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) return
      setLocalGuests(prev => prev.filter(g => g.id !== guestId))
      showBanner('Guest removed')
    } catch { /* silent */ }
  }, [wedding.id])

  const copyLink = (guestSlug: string) => {
    const url = `${appUrl}/e/${wedding.slug}/${guestSlug}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(guestSlug)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const exportCSV = () => {
    const headers = ['Name', 'RSVP Status', 'Email', 'Phone', 'Opened', 'Party Size', 'Dietary', 'Note', 'Personal Link']
    const rows = filtered.map(g => [
      g.name, g.rsvp_status, g.email ?? '', g.phone ?? '',
      g.opened_at ? new Date(g.opened_at).toLocaleDateString('en-GB') : 'Not yet',
      String(g.party_size ?? 1), g.dietary ?? '', g.rsvp_note ?? '',
      `${appUrl}/e/${wedding.slug}/${g.slug}`,
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${wedding.slug}-guests-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const navigate = (s: string) => {
    setActiveSection(s as Section)
    setMobileNavOpen(false)
  }

  const showGuestbook = wedding.config.show_guestbook !== false

  // ── Layout constants ─────────────────────────────────────────────────────────
  const SIDEBAR_W = sidebarCollapsed ? 68 : 240

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex" style={{ minHeight: '100dvh', background: '#0F0F11' }}>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showAddGuest && (
        <AddGuestModal
          weddingId={wedding.id}
          onClose={() => setShowAddGuest(false)}
          onSuccess={handleGuestAdded}
        />
      )}
      {showImportGuests && (
        <ImportGuestsModal
          weddingId={wedding.id}
          onClose={() => setShowImportGuests(false)}
          onSuccess={handleImportDone}
        />
      )}
      <AnimatePresence>
        {showDeleteModal && (
          <ConfirmModal
            title="Delete this wedding?"
            description={`This will permanently delete the invitation for ${wedding.couple_names.name1} & ${wedding.couple_names.name2}, including all guests, RSVPs, and media. This cannot be undone.`}
            confirmLabel="Delete permanently"
            requireTyping="DELETE"
            onConfirm={() => { setShowDeleteModal(false); deleteWedding() }}
            onCancel={() => setShowDeleteModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Success banner ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            key="banner"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full backdrop-blur-sm"
            style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
          >
            <span className="font-body text-xs tracking-wider">✓ {successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col sticky top-0 h-screen overflow-y-auto transition-all duration-300 ease-in-out shrink-0"
        style={{ width: SIDEBAR_W, background: '#09090B', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        <SidebarContent
          wedding={wedding}
          activeSection={activeSection}
          collapsed={sidebarCollapsed}
          guestCount={localGuests.length}
          showGuestbook={showGuestbook}
          userEmail={userEmail}
          themeAccent={invTheme.accent}
          themeRaw={invTheme.raw}
          onNavigate={s => setActiveSection(s)}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Mobile sidebar overlay ──────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              key="mobile-sidebar"
              className="fixed left-0 top-0 h-screen z-50 flex flex-col w-64 md:hidden overflow-y-auto"
              style={{ background: '#09090B', borderRight: '1px solid rgba(255,255,255,0.05)' }}
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            >
              <SidebarContent
                wedding={wedding}
                activeSection={activeSection}
                collapsed={false}
                guestCount={localGuests.length}
                showGuestbook={showGuestbook}
                userEmail={userEmail}
                themeAccent={invTheme.accent}
                themeRaw={invTheme.raw}
                onNavigate={s => setActiveSection(s)}
                onLogout={handleLogout}
                onClose={() => setMobileNavOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 md:px-5 shrink-0"
          style={{ background: 'rgba(9,9,11,0.92)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
        >
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-ivory/40 hover:text-ivory/70 transition-colors mr-1"
              onClick={() => setMobileNavOpen(true)}
            >
              <Icon paths={ICONS.menu} />
            </button>

            {/* Desktop sidebar collapse toggle */}
            <button
              className="hidden md:flex text-ivory/25 hover:text-ivory/60 transition-colors"
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon paths={sidebarCollapsed ? ICONS.chevronRight : ICONS.chevronLeft} />
            </button>

            {/* Breadcrumb */}
            <Link
              href="/studio"
              className="hidden md:block font-body text-ivory/25 text-xs hover:text-ivory/50 transition-colors tracking-wide whitespace-nowrap"
            >
              My Weddings
            </Link>
            <span className="hidden md:block text-white/10 text-xs">/</span>
            <span className="font-display text-ivory/80 text-sm italic truncate max-w-[160px] md:max-w-none">
              {wedding.couple_names.name1} &amp; {wedding.couple_names.name2}
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Preview dropdown */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setPreviewOpen(p => !p)}
                className="flex items-center gap-1.5 font-body text-xs text-ivory/30 hover:text-ivory/60 transition-colors"
              >
                Preview
                <Icon paths={ICONS.externalLink} className="w-3 h-3" />
              </button>
              {previewOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setPreviewOpen(false)} />
                  <div
                    className="absolute right-0 top-7 z-40 w-64 rounded-xl overflow-hidden shadow-xl"
                    style={{ background: '#1A1A1C', border: '1px solid rgba(255,255,255,0.10)' }}
                  >
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <p className="font-body text-[10px] tracking-widest uppercase text-ivory/30">
                        Preview as guest
                      </p>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <a
                        href={`/e/${wedding.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setPreviewOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors"
                      >
                        <span className="font-body text-xs text-gold/70">General view</span>
                      </a>
                      {localGuests.slice(0, 20).map(g => (
                        <a
                          key={g.id}
                          href={`/e/${wedding.slug}/${g.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setPreviewOpen(false)}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors group"
                        >
                          <span className="font-body text-xs text-ivory/60 group-hover:text-ivory/90 truncate">{g.name}</span>
                          <Icon paths={ICONS.externalLink} className="w-3 h-3 text-ivory/20 shrink-0" />
                        </a>
                      ))}
                      {localGuests.length === 0 && (
                        <p className="px-4 py-3 font-body text-xs text-ivory/25">No guests yet</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Status + Publish/Unpublish */}
            <StatusPill status={wedding.status} />
            <PublishButton weddingId={wedding.id} currentStatus={wedding.status} themeAccent={invTheme.accent} />

            {/* User avatar */}
            <button
              onClick={handleLogout}
              title={`Sign out${userEmail ? ` (${userEmail})` : ''}`}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-gold/20 ml-1"
              style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.20)' }}
            >
              <span className="font-body text-gold text-xs">
                {userEmail?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </button>
          </div>
        </header>

        {/* ── Page content ────────────────────────────────────────────────── */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-hidden">
          {/* QR Modal */}
          <AnimatePresence>
            {showQRModal && (
              <QRCodeModal
                url={qrGuestSlug
                  ? `${appUrl}/e/${wedding.slug}/${qrGuestSlug}`
                  : `${appUrl}/e/${wedding.slug}`
                }
                title="Share Invitation"
                subtitle={qrGuestSlug
                  ? `Personal link for ${localGuests.find(g => g.slug === qrGuestSlug)?.name ?? 'guest'}`
                  : `${wedding.couple_names.name1} & ${wedding.couple_names.name2}`
                }
                whatsappText={`You're invited to the wedding of ${wedding.couple_names.name1} & ${wedding.couple_names.name2}! Open your personal invitation: ${appUrl}/e/${wedding.slug}/${qrGuestSlug ?? ''}`}
                emailSubject={`You're invited — ${wedding.couple_names.name1} & ${wedding.couple_names.name2}`}
                emailBody={`Dear guest,\n\nYou are warmly invited to celebrate the wedding of ${wedding.couple_names.name1} & ${wedding.couple_names.name2}.\n\nOpen your invitation here:`}
                onClose={() => { setShowQRModal(false); setQrGuestSlug(null) }}
              />
            )}
          </AnimatePresence>

          <div className="max-w-5xl mx-auto">
            <AnimatePresence mode="wait">

              {/* ── Overview ──────────────────────────────────────────────── */}
              {activeSection === 'overview' && (
                <motion.div key="overview" {...fadeProps}>
                  <DashboardOverview
                    wedding={wedding}
                    stats={stats}
                    setupPercent={setupPercent}
                    setupChecklist={setupChecklist}
                    onNavigate={navigate}
                    onAddGuest={() => setShowAddGuest(true)}
                    onImportGuests={() => setShowImportGuests(true)}
                    appUrl={appUrl}
                    themeAccent={invTheme.accent}
                    themeRaw={invTheme.raw}
                  />
                </motion.div>
              )}

              {/* ── Guests ────────────────────────────────────────────────── */}
              {activeSection === 'guests' && (
                <motion.div key="guests" {...fadeProps} className="space-y-5">
                  <SectionHeading title="Guest List" description="Manage your guests, RSVPs and personal invitation links." />

                  {/* Stats row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Attending',     value: stats.attending, color: '#4ade80', sub: `${stats.totalSeats} seats` },
                      { label: 'Declined',      value: stats.declined,  color: '#f87171', sub: undefined },
                      { label: 'Awaiting',      value: stats.pending,   color: '#C9A84C', sub: undefined },
                      { label: 'Total Guests',  value: stats.total,     color: '#C9A84C', sub: undefined },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <p className="font-body text-[11px] tracking-wider uppercase text-ivory/30 mb-2">{stat.label}</p>
                        <p className="font-display" style={{ fontSize: '2rem', fontWeight: 300, color: stat.color, lineHeight: 1 }}>
                          {stat.value}
                        </p>
                        {stat.sub && <p className="font-body text-xs text-ivory/25 mt-1">{stat.sub}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Engagement */}
                  <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <p className="font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25 mb-4">Engagement</p>
                    <div className="grid sm:grid-cols-2 gap-6">
                      {[
                        { label: 'Open rate', value: stats.openRate, count: `${stats.opened}/${stats.total}`, color: '#C9A84C, #E8CC7A', textColor: 'text-gold' },
                        { label: 'RSVP rate', value: stats.rsvpRate, count: `${stats.attending + stats.declined}/${stats.total}`, color: '#4ade80, #22c55e', textColor: 'text-green-400' },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="flex items-end justify-between mb-1.5">
                            <p className="font-body text-xs text-ivory/40">{item.label}</p>
                            <p className="font-body text-sm text-ivory/60">{item.count}</p>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.value}%` }}
                              transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${item.color})` }}
                            />
                          </div>
                          <p className={`font-body text-xs mt-1 ${item.textColor}`}>{item.value}%</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Guest table */}
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    {/* Toolbar */}
                    <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-white/[0.05]">
                      <div className="relative flex-1">
                        <Icon paths={ICONS.search} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory/25 w-3.5 h-3.5" />
                        <input
                          type="search"
                          placeholder="Search guests…"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg font-body text-sm text-ivory placeholder-ivory/20 focus:outline-none focus:border-gold/30 transition-colors"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {(['all', 'attending', 'declined', 'pending'] as FilterStatus[]).map(f => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg font-body text-xs tracking-wide transition-colors capitalize ${
                              filter === f
                                ? 'bg-gold/10 text-gold border border-gold/25'
                                : 'text-ivory/30 border border-white/[0.07] hover:border-white/15'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                        <button
                          onClick={() => setShowAddGuest(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs text-gold/80 border border-gold/20 hover:border-gold/40 hover:text-gold bg-gold/[0.05] transition-colors"
                        >
                          <Icon paths={ICONS.plus} className="w-3 h-3" />
                          Add
                        </button>
                        <button
                          onClick={() => setShowImportGuests(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs text-ivory/40 border border-white/[0.07] hover:border-white/15 hover:text-ivory/70 transition-colors"
                        >
                          <Icon paths={ICONS.upload} className="w-3 h-3" />
                          Import
                        </button>
                        <button
                          onClick={exportCSV}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs text-ivory/30 border border-white/[0.05] hover:border-white/10 hover:text-ivory/60 transition-colors"
                        >
                          <Icon paths={ICONS.download} className="w-3 h-3" />
                          Export
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {['Name', 'Contact', 'Status', 'Opened', 'Link'].map((h, i) => (
                              <th
                                key={h}
                                className={`text-left py-3 px-4 font-body font-normal text-[11px] tracking-[0.2em] uppercase text-ivory/25 ${
                                  i === 1 ? 'hidden sm:table-cell' : i === 3 ? 'hidden md:table-cell' : ''
                                }`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-14 text-center font-body text-ivory/20 text-sm">
                                {localGuests.length === 0 ? (
                                  <span>
                                    No guests yet —{' '}
                                    <button onClick={() => setShowAddGuest(true)} className="text-gold/50 hover:text-gold underline underline-offset-2 transition-colors">
                                      add your first guest
                                    </button>
                                    {' '}or{' '}
                                    <button onClick={() => setShowImportGuests(true)} className="text-gold/50 hover:text-gold underline underline-offset-2 transition-colors">
                                      import a list
                                    </button>
                                  </span>
                                ) : 'No guests match your search'}
                              </td>
                            </tr>
                          )}
                          {filtered.map((guest, i) => (
                            <motion.tr
                              key={guest.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.015 }}
                              className="transition-colors hover:bg-white/[0.02]"
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                            >
                              <td className="py-3.5 px-4">
                                <p className="font-body text-sm text-ivory/80">{guest.name}</p>
                                {(guest.party_size ?? 1) > 1 && (
                                  <p className="font-body text-xs text-ivory/25 mt-0.5">+{(guest.party_size ?? 1) - 1} guest{(guest.party_size ?? 1) - 1 !== 1 ? 's' : ''}</p>
                                )}
                              </td>
                              <td className="py-3.5 px-4 hidden sm:table-cell">
                                <p className="font-body text-xs text-ivory/35">{guest.email || guest.phone || '—'}</p>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full font-body text-xs tracking-wide ${
                                  guest.rsvp_status === 'attending' ? 'status-badge-attending' :
                                  guest.rsvp_status === 'declined'  ? 'status-badge-declined'  :
                                  'status-badge-pending'
                                }`}>
                                  {guest.rsvp_status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 hidden md:table-cell">
                                <span className={`font-body text-xs ${guest.opened_at ? 'text-green-400/70' : 'text-ivory/20'}`}>
                                  {guest.opened_at
                                    ? new Date(guest.opened_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                    : 'Not yet'
                                  }
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => copyLink(guest.slug)}
                                    className="font-body text-xs text-gold/50 hover:text-gold transition-colors"
                                    title={`Copy link for ${guest.name}`}
                                  >
                                    {copied === guest.slug ? '✓' : 'Copy'}
                                  </button>
                                  <button
                                    onClick={() => { setQrGuestSlug(guest.slug); setShowQRModal(true) }}
                                    className="text-ivory/25 hover:text-ivory/60 transition-colors"
                                    title={`QR code for ${guest.name}`}
                                  >
                                    <Icon paths={ICONS.qr} className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={whatsappLink(guest.slug, guest.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-500/40 hover:text-emerald-400/80 transition-colors"
                                    title={`Send WhatsApp to ${guest.name}`}
                                  >
                                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.859L.058 23.617a.5.5 0 00.61.637l5.939-1.55A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.505-5.25-1.385l-.378-.214-3.527.921.937-3.451-.233-.384A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                                    </svg>
                                  </a>
                                  <button
                                    onClick={() => deleteGuest(guest.id, guest.name)}
                                    className="text-red-500/25 hover:text-red-400/70 transition-colors"
                                    title={`Remove ${guest.name}`}
                                  >
                                    <Icon paths={ICONS.x} className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="font-body text-xs text-ivory/20">{filtered.length} of {localGuests.length} guests</p>
                      <p className="font-body text-xs text-ivory/15">
                        {stats.attending} attending · {stats.declined} declined · {stats.pending} pending
                      </p>
                    </div>
                  </div>

                  {/* Dietary / notes */}
                  {localGuests.some(g => g.dietary || g.rsvp_note) && (
                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      <p className="font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25 mb-4">Dietary Requirements &amp; Notes</p>
                      <div className="space-y-3">
                        {localGuests.filter(g => g.dietary || g.rsvp_note).map(g => (
                          <div key={g.id} className="pb-3 border-b border-white/[0.05] last:border-0 last:pb-0">
                            <p className="font-body text-sm text-ivory/70">{g.name}</p>
                            {g.dietary   && <p className="font-body text-xs text-gold/60 mt-0.5">🍽 {g.dietary}</p>}
                            {g.rsvp_note && <p className="font-body text-xs text-ivory/35 mt-0.5 italic">"{g.rsvp_note}"</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Guestbook ─────────────────────────────────────────────── */}
              {activeSection === 'guestbook' && (
                <motion.div key="guestbook" {...fadeProps} className="space-y-4">
                  <SectionHeading title="Guestbook" description="Messages your guests have left for you." />
                  {gbLoading && (
                    <div className="py-20 text-center font-body text-ivory/20 text-sm tracking-wider animate-pulse">Loading messages…</div>
                  )}
                  {!gbLoading && guestbook.length === 0 && (
                    <div
                      className="flex flex-col items-center justify-center py-20 rounded-2xl text-center"
                      style={{ border: '1px dashed rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.12)' }}>
                        <Icon paths={ICONS.guestbook} className="text-gold/50" />
                      </div>
                      <p className="font-display text-ivory/30 italic mb-1" style={{ fontWeight: 300 }}>No messages yet</p>
                      <p className="font-body text-xs text-ivory/15 max-w-xs leading-relaxed">
                        Guestbook messages from your guests will appear here once they start leaving notes.
                      </p>
                    </div>
                  )}
                  {!gbLoading && guestbook.length > 0 && (
                    <>
                      <p className="font-body text-[11px] tracking-[0.2em] uppercase text-ivory/25">
                        {guestbook.length} message{guestbook.length !== 1 ? 's' : ''}
                      </p>
                      <AnimatePresence>
                        {guestbook.map((entry, i) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: i * 0.04 }}
                            className="rounded-2xl p-5 group"
                            style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)' }}
                          >
                            <p className="font-display text-ivory/75 text-sm italic leading-relaxed mb-3">
                              &ldquo;{entry.message}&rdquo;
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="font-body text-xs text-ivory/40">— {entry.guest_name}</p>
                              <div className="flex items-center gap-3">
                                <p className="font-body text-xs text-ivory/20">
                                  {new Date(entry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <button
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(`/api/guestbook?entryId=${entry.id}&weddingId=${wedding.id}`, { method: 'DELETE' })
                                      if (res.ok) setGuestbook(prev => prev.filter(e => e.id !== entry.id))
                                    } catch { /* silent */ }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-red-500/30 hover:text-red-400/70 transition-all"
                                  title="Delete message"
                                >
                                  <Icon paths={ICONS.x} className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>
              )}

              {/* ── Story ─────────────────────────────────────────────────── */}
              {activeSection === 'story' && (
                <motion.div key="story" {...fadeProps}>
                  <SectionHeading title="Our Story" description="Add the milestones that make up your love story. They appear on the invitation page." />
                  <StoryEditor
                    weddingId={wedding.id}
                    coupleName1={wedding.couple_names.name1}
                    coupleName2={wedding.couple_names.name2}
                    onCountChange={setLocalStoryCount}
                  />
                </motion.div>
              )}

              {/* ── Gallery ───────────────────────────────────────────────── */}
              {activeSection === 'gallery' && (
                <motion.div key="gallery" {...fadeProps}>
                  <SectionHeading title="Gallery" description="Upload photos, organise albums, and manage what guests can download." />
                  <GalleryManager weddingId={wedding.id} />
                </motion.div>
              )}

              {/* ── Analytics ─────────────────────────────────────────────── */}
              {activeSection === 'analytics' && (
                <motion.div key="analytics" {...fadeProps}>
                  <SectionHeading title="Analytics" description="Guest engagement metrics for your wedding invitation." />
                  <AnalyticsPanel weddingId={wedding.id} />
                </motion.div>
              )}

              {/* ── Reminders ─────────────────────────────────────────────── */}
              {activeSection === 'reminders' && (
                <motion.div key="reminders" {...fadeProps}>
                  <RemindersSection wedding={wedding} guests={localGuests} appUrl={appUrl} />
                </motion.div>
              )}

              {/* ── Thank You ─────────────────────────────────────────────── */}
              {activeSection === 'thankyou' && (
                <motion.div key="thankyou" {...fadeProps}>
                  <ThankYouSection wedding={wedding} guests={localGuests} appUrl={appUrl} />
                </motion.div>
              )}

              {/* ── Print Card ────────────────────────────────────────────── */}
              {activeSection === 'invitations' && (
                <motion.div key="invitations" {...fadeProps}>
                  <InvitationCardSection wedding={wedding} appUrl={appUrl} />
                </motion.div>
              )}

              {/* ── Settings ──────────────────────────────────────────────── */}
              {activeSection === 'settings' && (
                <motion.div key="settings" {...fadeProps} className="space-y-8">
                  <SectionHeading title="Settings" description="Edit venue details, dress code, feature toggles and more." />
                  <WeddingSettingsEditor wedding={wedding} />

                  {/* ── Danger zone ── */}
                  <div
                    className="rounded-2xl p-5"
                    style={{ border: '1px solid rgba(248,113,113,0.12)', background: 'rgba(248,113,113,0.03)' }}
                  >
                    <p className="font-body text-[11px] tracking-[0.25em] uppercase text-red-400/50 mb-3">Danger zone</p>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-body text-sm text-ivory/50">Delete this wedding</p>
                        <p className="font-body text-xs text-ivory/25 mt-0.5 leading-relaxed">
                          Permanently removes all guests, RSVPs, photos, and analytics. Cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="shrink-0 font-body text-xs tracking-widest uppercase px-4 py-2 rounded-xl border transition-colors"
                        style={{ color: 'rgba(248,113,113,0.6)', borderColor: 'rgba(248,113,113,0.2)' }}
                        onMouseEnter={e => { (e.currentTarget.style.color = '#f87171'); (e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)') }}
                        onMouseLeave={e => { (e.currentTarget.style.color = 'rgba(248,113,113,0.6)'); (e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)') }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
              {activeSection === 'timeline' && (
                <motion.div key="timeline" {...fadeProps}>
                  <SectionHeading title="Programme" description="Build your day-of schedule. Guests see this on the invitation page." />
                  <ScheduleEditor weddingId={wedding.id} />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Shared animation props ─────────────────────────────────────────────────────

const fadeProps = {
  initial:    { opacity: 0, y: 10 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:     { label: 'Draft',     cls: 'bg-white/5 text-ivory/40 border-white/10' },
    ready:     { label: 'Ready',     cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    published: { label: 'Live',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  }
  const { label, cls } = map[status] ?? map.draft

  return (
    <span className={`flex items-center gap-1.5 font-body text-xs tracking-wide px-2.5 py-1 rounded-full border ${cls}`}>
      {status === 'published' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      {label}
    </span>
  )
}

// ── Publish / Unpublish button ────────────────────────────────────────────────

function PublishButton({ weddingId, currentStatus, themeAccent }: { weddingId: string; currentStatus: string; themeAccent: string }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const handleAction = async (action: 'publish' | 'unpublish') => {
    setLoading(true)
    try {
      await fetch(`/api/weddings/${weddingId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (currentStatus === 'published') {
    return (
      <button
        onClick={() => handleAction('unpublish')}
        disabled={loading}
        className="font-body text-ivory/40 hover:text-ivory/70 border border-white/10 hover:border-white/20 text-xs tracking-widest uppercase px-4 py-1.5 transition-colors rounded-lg disabled:opacity-40"
      >
        {loading ? '…' : 'Unpublish'}
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="font-body text-obsidian text-xs tracking-widest uppercase px-4 py-1.5 transition-opacity rounded-lg disabled:opacity-40 hover:opacity-85"
        style={{ background: themeAccent }}
      >
        {loading ? '…' : currentStatus === 'draft' ? 'Publish' : 'Go live'}
      </button>
      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            title="Ready to go live?"
            description="Publishing makes your invitation publicly visible to anyone with the link. You can unpublish it at any time from this dashboard."
            confirmLabel="Yes, publish"
            confirmClassName="text-obsidian"
            confirmStyle={{ background: themeAccent }}
            onConfirm={() => { setShowConfirm(false); handleAction('publish') }}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
