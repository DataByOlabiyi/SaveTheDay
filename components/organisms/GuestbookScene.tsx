'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GoldDivider } from '@/components/atoms/GoldText'
import { Events } from '@/lib/analytics/events'
import type { GuestbookEntry } from '@/lib/db/types'

const REACTION_EMOJIS = ['❤️', '🥂', '✨', '🎊', '🙏', '💐']

function ReactionBar({
  entry,
  weddingId,
  guestId,
}: { entry: GuestbookEntry; weddingId: string; guestId?: string }) {
  const [reactions, setReactions] = useState<Record<string, number>>(entry.reactions ?? {})
  const [reacted, setReacted]     = useState<Set<string>>(new Set())
  const [loading, setLoading]     = useState<string | null>(null)

  const toggle = useCallback(async (emoji: string) => {
    if (loading) return
    setLoading(emoji)

    const alreadyReacted = reacted.has(emoji)
    const action = alreadyReacted ? 'remove' : 'add'

    // Optimistic update
    setReactions(prev => {
      const next = { ...prev }
      const cur  = next[emoji] ?? 0
      if (action === 'add') next[emoji] = cur + 1
      else { next[emoji] = Math.max(0, cur - 1); if (next[emoji] === 0) delete next[emoji] }
      return next
    })
    setReacted(prev => {
      const next = new Set(prev)
      action === 'add' ? next.add(emoji) : next.delete(emoji)
      return next
    })

    try {
      const res = await fetch('/api/guestbook/react', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entryId: entry.id, weddingId, emoji, action, guestId }),
      })
      if (res.ok) {
        const data = await res.json()
        setReactions(data.reactions ?? {})
        if (action === 'add') Events.reactionAdded(weddingId, guestId, emoji)
      } else {
        // Rollback
        setReactions(entry.reactions ?? {})
        setReacted(prev => {
          const next = new Set(prev)
          action === 'add' ? next.delete(emoji) : next.add(emoji)
          return next
        })
      }
    } catch {
      setReactions(entry.reactions ?? {})
    } finally {
      setLoading(null)
    }
  }, [loading, reacted, entry, weddingId, guestId])

  const hasAnyReaction = Object.values(reactions).some(v => v > 0)

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
      {/* Show existing reactions with counts */}
      {REACTION_EMOJIS.filter(e => (reactions[e] ?? 0) > 0).map(emoji => (
        <button
          key={emoji}
          onClick={() => toggle(emoji)}
          disabled={loading === emoji}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
            reacted.has(emoji)
              ? 'bg-emerald-DEFAULT/15 border border-emerald-DEFAULT/30'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
          aria-label={`${reacted.has(emoji) ? 'Remove' : 'Add'} ${emoji} reaction (${reactions[emoji] ?? 0})`}
          aria-pressed={reacted.has(emoji)}
        >
          <span>{emoji}</span>
          <span className="text-ivory/50" style={{ fontSize: '0.6rem' }}>{reactions[emoji]}</span>
        </button>
      ))}

      {/* Add reaction picker */}
      <ReactionPicker
        onSelect={toggle}
        existing={reactions}
        reacted={reacted}
        loading={loading}
      />
    </div>
  )
}

function ReactionPicker({
  onSelect, existing, reacted, loading,
}: {
  onSelect: (emoji: string) => void
  existing: Record<string, number>
  reacted:  Set<string>
  loading:  string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-7 h-6 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-ivory/40 hover:text-ivory/70 transition-all text-xs"
        aria-label="Add reaction"
        aria-expanded={open}
      >
        😊
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-1.5 flex gap-1 p-1.5 rounded-lg z-10"
            style={{ background: '#111A15', border: '1px solid rgba(12,168,110,0.2)' }}
            role="listbox"
            aria-label="Choose a reaction"
          >
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { onSelect(emoji); setOpen(false) }}
                disabled={loading === emoji}
                className={`w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-base ${
                  reacted.has(emoji) ? 'bg-emerald-DEFAULT/10' : ''
                }`}
                aria-label={`React with ${emoji}`}
                aria-selected={reacted.has(emoji)}
                role="option"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface GuestbookSceneProps {
  weddingId:    string
  guestId?:     string
  guestName?:   string
  coupleName1:  string
  coupleName2:  string
  showReactions?: boolean
  readonly?:    boolean
}

export function GuestbookScene({
  weddingId,
  guestId,
  guestName,
  coupleName1,
  coupleName2,
  showReactions = true,
  readonly      = false,
}: GuestbookSceneProps) {
  const [entries, setEntries]       = useState<GuestbookEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [name, setName]             = useState(guestName ?? '')
  const [message, setMessage]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Load existing entries on mount
  useEffect(() => {
    fetch(`/api/guestbook?weddingId=${weddingId}`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.entries ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [weddingId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !message.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId, guestId, guestName: name.trim(), message: message.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Something went wrong')
      }

      const data = await res.json()
      // Prepend new entry so it appears at the top
      setEntries(prev => [data.entry, ...prev])
      setMessage('')
      setSubmitted(true)
      Events.guestbookWritten(weddingId, guestId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your message')
    } finally {
      setSubmitting(false)
    }
  }

  const charsLeft = 500 - message.length

  return (
    <section className="py-20 px-6 relative">
      {/* Subtle background wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 40% at 50% 50%, rgba(12, 168, 110, 0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-sm mx-auto">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <p
            className="font-body tracking-[0.3em] uppercase mb-3"
            style={{ fontSize: '0.65rem', color: 'rgba(12, 168, 110, 0.5)' }}
          >
            Guestbook
          </p>
          <GoldDivider className="mb-4" />
          <p
            className="font-display text-ivory/55"
            style={{ fontSize: '1rem', fontStyle: 'italic', fontWeight: 300 }}
          >
            Leave a message for {coupleName1} &amp; {coupleName2}
          </p>
        </motion.div>

        {/* ── Write form ── */}
        {readonly && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center font-body text-ivory/25 text-xs tracking-wide mb-14"
          >
            Open your personal invitation to leave a message
          </motion.p>
        )}
        <AnimatePresence mode="wait">
          {!readonly && !submitted ? (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleSubmit}
              className="space-y-4 mb-14"
              noValidate
            >
              {/* Name — only shown when guest is not personalised */}
              {!guestName && (
                <div>
                  <label className="rsvp-label">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="rsvp-input"
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              {/* Message */}
              <div>
                <label className="rsvp-label">
                  Your Message{' '}
                  <span
                    className="text-ivory/25"
                    style={{ fontWeight: 300 }}
                  >
                    ({charsLeft} left)
                  </span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="rsvp-input resize-none"
                  rows={4}
                  placeholder="Share your wishes with the happy couple…"
                  maxLength={500}
                  required
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-red-400"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={submitting || !message.trim() || !name.trim()}
                className="btn-gold w-full py-3.5"
                whileTap={{ scale: 0.98 }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending…
                  </span>
                ) : (
                  'Sign the Guestbook'
                )}
              </motion.button>
            </motion.form>
          ) : submitted && !readonly ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center py-8 mb-14"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
                className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(12,168,110,0.12), rgba(12,168,110,0.04))',
                  border: '1px solid rgba(12,168,110,0.25)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <motion.path
                    d="M5 13l4 4L19 7"
                    stroke="#0CA86E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  />
                </svg>
              </motion.div>
              <p
                className="font-display text-ivory/80 mb-1"
                style={{ fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 300 }}
              >
                Thank you, {name.split(' ')[0]} ✨
              </p>
              <p className="font-body text-ivory/35 text-xs tracking-wider">
                Your message has been added to the guestbook
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── Existing entries ── */}
        {!loading && entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <GoldDivider wide className="mb-8" />

            <div className="space-y-6">
              <AnimatePresence>
                {entries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    className="relative pl-4"
                    style={{ borderLeft: '1px solid rgba(12,168,110,0.15)' }}
                  >
                    <p
                      className="font-display text-ivory/70 leading-relaxed mb-2"
                      style={{ fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 300 }}
                    >
                      &ldquo;{entry.message}&rdquo;
                    </p>
                    <p className="text-xs text-ivory/30 tracking-wider">
                      — {entry.guest_name}
                      <span className="ml-2 text-ivory/15">
                        {new Date(entry.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </p>
                    {showReactions && (
                      <ReactionBar
                        entry={entry}
                        weddingId={weddingId}
                        guestId={guestId}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Empty state — shown after load if no messages yet */}
        {!loading && entries.length === 0 && submitted === false && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-col items-center gap-3 py-6"
          >
            {/* Quill illustration */}
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <path
                d="M30 4C22 4 12 12 10 28L14 24C14 24 16 16 24 12"
                stroke="rgba(12,168,110,0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 28L8 32"
                stroke="rgba(12,168,110,0.35)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M30 4C22 10 16 18 10 28"
                stroke="rgba(12,168,110,0.5)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeDasharray="2 3"
              />
              {/* Ink drop */}
              <circle cx="8.5" cy="31.5" r="1.5" fill="rgba(61,217,160,0.4)" />
            </svg>

            <p className="text-center text-xs text-ivory/25 tracking-wider">
              Be the first to leave a message
            </p>
          </motion.div>
        )}
      </div>
    </section>
  )
}
