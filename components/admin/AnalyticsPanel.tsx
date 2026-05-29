'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { AnalyticsSummary } from '@/lib/db/types'

interface AnalyticsPanelProps {
  weddingId:   string
  adminSecret: string
}

const STAT_CARDS = [
  { key: 'total_views',     label: 'Page Opens',      color: '#C9A84C', icon: '👁' },
  { key: 'unique_opens',    label: 'Unique Guests',   color: '#3DD9A0', icon: '👥' },
  { key: 'rsvp_count',      label: 'RSVPs',           color: '#C9A84C', icon: '✅' },
  { key: 'guestbook_count', label: 'Guestbook Msgs',  color: '#3DD9A0', icon: '✍️' },
  { key: 'gallery_views',   label: 'Gallery Views',   color: '#C9A84C', icon: '🖼' },
  { key: 'total_downloads', label: 'Photo Downloads', color: '#3DD9A0', icon: '⬇️' },
  { key: 'shares',          label: 'Shares',          color: '#C9A84C', icon: '📤' },
] as const

const EVENT_LABELS: Record<string, string> = {
  opened:           'Invitation Opens',
  seal_tapped:      'Seal Tapped',
  video_watched:    'Video Watched',
  rsvp_submitted:   'RSVP Submitted',
  shared:           'Shares',
  guestbook_written:'Guestbook Written',
  gallery_viewed:   'Gallery Viewed',
  photo_downloaded: 'Photo Downloads',
  story_viewed:     'Story Viewed',
  reaction_added:   'Reactions Added',
  page_viewed:      'Page Views',
}

export function AnalyticsPanel({ weddingId, adminSecret }: AnalyticsPanelProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/analytics?weddingId=${weddingId}&secret=${encodeURIComponent(adminSecret)}`)
      .then(r => r.json())
      .then(data => setSummary(data.summary))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [weddingId, adminSecret])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="admin-card p-5 h-24 skeleton" />
        ))}
      </div>
    )
  }

  if (!summary) return (
    <div className="admin-card p-8 text-center">
      <p className="text-ivory/25 text-sm tracking-wider">Analytics unavailable</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Summary stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ key, label, color, icon }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="admin-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs tracking-widest uppercase text-ivory/25">{label}</p>
              <span className="text-base" aria-hidden="true">{icon}</span>
            </div>
            <p
              className="font-display"
              style={{ fontSize: '2rem', fontWeight: 300, color, lineHeight: 1 }}
            >
              {(summary[key] ?? 0).toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Event breakdown */}
      {Object.keys(summary.by_event).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="admin-card p-5"
        >
          <h3 className="text-xs tracking-widest uppercase text-ivory/30 mb-5">Event Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(summary.by_event)
              .sort(([, a], [, b]) => b - a)
              .map(([eventType, count]) => {
                const max = Math.max(...Object.values(summary.by_event))
                const pct = max > 0 ? Math.round((count / max) * 100) : 0
                return (
                  <div key={eventType}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ivory/40">
                        {EVENT_LABELS[eventType] ?? eventType}
                      </span>
                      <span className="text-xs text-ivory/60 font-mono">{count.toLocaleString()}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #C9A84C, #E8CC7A)' }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
