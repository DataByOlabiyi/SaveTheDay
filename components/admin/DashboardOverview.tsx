'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Wedding } from '@/lib/db/types'

interface SetupItem {
  id: string
  label: string
  done: boolean
}

interface Stats {
  total: number
  attending: number
  pending: number
  declined: number
  openRate: number
  rsvpRate: number
  totalSeats: number
}

interface DashboardOverviewProps {
  wedding:          Wedding
  stats:            Stats
  setupPercent:     number
  setupChecklist:   SetupItem[]
  onNavigate:       (section: string) => void
  onAddGuest:       () => void
  onImportGuests:   () => void
  appUrl:           string
  themeAccent:      string
  themeRaw:         string
}

const CARD_STYLE = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.10)',
}

export function DashboardOverview({
  wedding,
  stats,
  setupPercent,
  setupChecklist,
  onNavigate,
  onAddGuest,
  onImportGuests,
  appUrl,
  themeAccent,
  themeRaw,
}: DashboardOverviewProps) {
  const { couple_names, wedding_date, city } = wedding

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const countdown = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const d = new Date(wedding_date)
    d.setHours(0, 0, 0, 0)
    return Math.ceil((d.getTime() - today.getTime()) / 86400000)
  }, [wedding_date])

  const isPublished = wedding.status === 'published'

  const weddingDateLabel = new Date(wedding_date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-6">

      {/* ── Welcome hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl p-7 md:p-10"
        style={{
          background: `linear-gradient(135deg, rgba(${themeRaw},0.09) 0%, rgba(${themeRaw},0.03) 50%, rgba(255,255,255,0.01) 100%)`,
          border: `1px solid rgba(${themeRaw},0.18)`,
        }}
      >
        <div
          className="pointer-events-none absolute top-0 right-0 w-72 h-72"
          style={{ background: `radial-gradient(ellipse at top right, rgba(${themeRaw},0.12) 0%, transparent 65%)` }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="font-body text-xs tracking-[0.25em] uppercase text-gold/60 mb-2">
              {greeting}
            </p>
            <h1
              className="font-display text-ivory mb-1"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 300, lineHeight: 1.15 }}
            >
              {couple_names.name1}{' '}
              <span className="text-gold italic">&amp;</span>{' '}
              {couple_names.name2}
            </h1>
            <p className="font-body text-ivory/35 text-sm mt-1.5">
              {weddingDateLabel}{city ? ` · ${city}` : ''}
            </p>
          </div>

          {/* Countdown */}
          <div className="shrink-0 text-center sm:text-right">
            {countdown > 0 ? (
              <>
                <p
                  className="font-display text-gold"
                  style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)', fontWeight: 300, lineHeight: 1 }}
                >
                  {countdown}
                </p>
                <p className="font-body text-xs tracking-[0.2em] uppercase text-ivory/35 mt-1">
                  {countdown === 1 ? 'day to go' : 'days to go'}
                </p>
              </>
            ) : countdown === 0 ? (
              <>
                <p className="font-display text-3xl text-gold italic">Today!</p>
                <p className="font-body text-xs tracking-widest uppercase text-ivory/30 mt-1">The big day</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl text-ivory/40 italic">Memories made</p>
                <p className="font-body text-xs tracking-widest uppercase text-ivory/20 mt-1">{Math.abs(countdown)} days ago</p>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Setup checklist / Live banner ── */}
      {!isPublished ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)' }}
        >
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.05]">
            <div>
              <p className="font-body text-sm text-ivory/80">Setup progress</p>
              <p className="font-body text-xs text-ivory/30 mt-0.5">Complete these steps before publishing</p>
            </div>
            <span className="font-display text-2xl" style={{ fontWeight: 300, color: themeAccent }}>
              {setupPercent}%
            </span>
          </div>
          <div className="h-px bg-white/[0.04] relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${setupPercent}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0"
              style={{ background: themeAccent }}
            />
          </div>
          <div className="px-6 py-5 grid sm:grid-cols-2 gap-3">
            {setupChecklist.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  const map: Record<string, string> = {
                    basics: 'settings', story: 'story', media: 'gallery', guests: 'guests',
                  }
                  onNavigate(map[item.id] ?? 'settings')
                }}
                className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  item.done ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-white/15'
                }`}>
                  {item.done && (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5.5L4 7.5L8 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={`font-body text-xs ${item.done ? 'text-ivory/35 line-through' : 'text-ivory/65'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex items-center gap-3 px-5 py-4 rounded-2xl"
          style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <p className="font-body text-emerald-400 text-sm">
            Your wedding is live at{' '}
            <a
              href={`${appUrl}/e/${wedding.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-emerald-300 transition-colors"
            >
              /e/{wedding.slug}
            </a>
          </p>
        </motion.div>
      )}

      {/* ── Stats cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14 }}
      >
        <p className="font-body text-[11px] tracking-[0.25em] uppercase text-ivory/25 mb-3">At a glance</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Guests', value: stats.total, color: '#C9A84C', sub: null },
            { label: 'Attending', value: stats.attending, color: '#4ade80', sub: stats.totalSeats > stats.attending ? `${stats.totalSeats} seats` : null },
            { label: 'Awaiting RSVP', value: stats.pending, color: '#C9A84C', sub: null },
            { label: 'RSVP Rate', value: `${stats.rsvpRate}%`, color: stats.rsvpRate > 50 ? '#4ade80' : '#C9A84C', sub: null },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl p-5 cursor-pointer hover:border-white/10 transition-colors"
              style={CARD_STYLE}
              onClick={() => onNavigate('guests')}
            >
              <p className="font-body text-[11px] tracking-wider uppercase text-ivory/30 mb-3">{stat.label}</p>
              <p
                className="font-display"
                style={{ fontSize: '2.25rem', fontWeight: 300, color: stat.color, lineHeight: 1 }}
              >
                {stat.value}
              </p>
              {stat.sub && (
                <p className="font-body text-xs text-ivory/25 mt-1.5">{stat.sub}</p>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Quick actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22 }}
      >
        <p className="font-body text-[11px] tracking-[0.25em] uppercase text-ivory/25 mb-3">Quick actions</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Add Guest',
              description: 'Add to your guest list',
              icon: <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6"/>,
              onClick: onAddGuest,
            },
            {
              label: 'Import List',
              description: 'Upload CSV or Excel',
              icon: <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>,
              onClick: onImportGuests,
            },
            {
              label: 'View Wedding',
              description: 'Preview as a guest',
              icon: (
                <>
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </>
              ),
              onClick: () => window.open(`${appUrl}/e/${wedding.slug}`, '_blank'),
            },
            {
              label: 'Manage Guests',
              description: 'RSVPs and details',
              icon: (
                <>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </>
              ),
              onClick: () => onNavigate('guests'),
            },
          ].map((action, i) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              onClick={action.onClick}
              className="text-left p-5 rounded-2xl transition-all group hover:border-gold/20"
              style={CARD_STYLE}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(201,168,76,0.09)', color: '#C9A84C' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4.5 h-4.5"
                  style={{ width: 18, height: 18 }}
                >
                  {action.icon}
                </svg>
              </div>
              <p className="font-body text-sm text-ivory/75 group-hover:text-ivory transition-colors">{action.label}</p>
              <p className="font-body text-xs text-ivory/25 mt-0.5 leading-relaxed">{action.description}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>

    </div>
  )
}
