'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StoryMilestone } from '@/lib/db/types'

interface StoryEditorProps {
  weddingId:   string
  adminSecret: string
}

const EMOJI_SUGGESTIONS = ['✨', '☕', '✈️', '💍', '💌', '🥂', '🎉', '💕', '🌸', '🏡', '💒', '🎊']

function MilestoneForm({
  milestone,
  weddingId,
  adminSecret,
  onSave,
  onDelete,
  onCancel,
}: {
  milestone?:   Partial<StoryMilestone>
  weddingId:    string
  adminSecret:  string
  onSave:       (m: StoryMilestone) => void
  onDelete?:    (id: string) => void
  onCancel?:    () => void
}) {
  const [title, setTitle]     = useState(milestone?.title ?? '')
  const [date, setDate]       = useState(milestone?.date_label ?? '')
  const [desc, setDesc]       = useState(milestone?.description ?? '')
  const [emoji, setEmoji]     = useState(milestone?.emoji ?? '')
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/story', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId, secret: adminSecret,
          id:          milestone?.id,
          title:       title.trim(),
          date_label:  date.trim() || undefined,
          description: desc.trim() || undefined,
          emoji:       emoji || undefined,
          sort_order:  milestone?.sort_order ?? 99,
          media_urls:  milestone?.media_urls ?? [],
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Save failed')
      }

      const data = await res.json()
      onSave(data.milestone)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!milestone?.id || !confirm('Delete this milestone?')) return
    setDeleting(true)
    try {
      await fetch(`/api/story?id=${milestone.id}&weddingId=${weddingId}&secret=${encodeURIComponent(adminSecret)}`, {
        method: 'DELETE',
      })
      onDelete?.(milestone.id)
    } catch {
      setError('Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="rounded-lg p-5 space-y-4"
      style={{ background: 'rgba(12,168,110,0.03)', border: '1px solid rgba(12,168,110,0.12)' }}
    >
      {/* Emoji picker */}
      <div>
        <label className="rsvp-label">Icon / Emoji</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {EMOJI_SUGGESTIONS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e === emoji ? '' : e)}
              className={`w-8 h-8 rounded text-base transition-all ${
                emoji === e
                  ? 'bg-emerald-DEFAULT/20 border border-emerald-DEFAULT/40'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
              aria-label={e}
              aria-pressed={emoji === e}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={emoji}
          onChange={e => setEmoji(e.target.value.slice(0, 8))}
          placeholder="Or type any emoji"
          className="rsvp-input"
          maxLength={8}
        />
      </div>

      <div>
        <label className="rsvp-label">Title *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="The Proposal"
          className="rsvp-input"
          maxLength={100}
          required
        />
      </div>

      <div>
        <label className="rsvp-label">Date / Label</label>
        <input
          type="text"
          value={date}
          onChange={e => setDate(e.target.value)}
          placeholder="February 2021"
          className="rsvp-input"
          maxLength={50}
        />
      </div>

      <div>
        <label className="rsvp-label">Story ({1000 - desc.length} chars left)</label>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Describe this moment in the couple's story…"
          className="rsvp-input resize-none"
          rows={4}
          maxLength={1000}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs text-ivory/40 hover:text-ivory/60 transition-colors tracking-wider uppercase"
          >
            Cancel
          </button>
        )}
        {milestone?.id && onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-xs text-red-400/60 hover:text-red-400 transition-colors tracking-wider uppercase border border-red-400/20"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="btn-gold px-6 py-2 text-xs disabled:opacity-40"
        >
          {saving ? 'Saving…' : milestone?.id ? 'Save Changes' : 'Add Milestone'}
        </button>
      </div>
    </div>
  )
}

export function StoryEditor({ weddingId, adminSecret }: StoryEditorProps) {
  const [milestones, setMilestones] = useState<StoryMilestone[]>([])
  const [loading, setLoading]       = useState(true)
  const [adding, setAdding]         = useState(false)
  const [editing, setEditing]       = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/story?weddingId=${weddingId}`)
      .then(r => r.json())
      .then(data => setMilestones(data.milestones ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [weddingId])

  const handleSave = (updated: StoryMilestone) => {
    setMilestones(prev => {
      const idx = prev.findIndex(m => m.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated].sort((a, b) => a.sort_order - b.sort_order)
    })
    setAdding(false)
    setEditing(null)
  }

  const handleDelete = (id: string) => {
    setMilestones(prev => prev.filter(m => m.id !== id))
    setEditing(null)
  }

  if (loading) {
    return <div className="text-center py-8 text-ivory/20 text-sm tracking-wider">Loading story…</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ivory/25 tracking-wider">
        {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} — drag to reorder (coming soon)
      </p>

      <AnimatePresence>
        {milestones.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {editing === m.id ? (
              <MilestoneForm
                milestone={m}
                weddingId={weddingId}
                adminSecret={adminSecret}
                onSave={handleSave}
                onDelete={handleDelete}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div
                className="admin-card p-4 flex items-start gap-3 cursor-pointer hover:border-emerald-DEFAULT/20 transition-colors"
                onClick={() => setEditing(m.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setEditing(m.id)}
                aria-label={`Edit milestone: ${m.title}`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{m.emoji ?? '•'}</span>
                <div className="min-w-0">
                  <p className="text-sm text-ivory/80">{m.title}</p>
                  {m.date_label && <p className="text-xs text-ivory/35 mt-0.5">{m.date_label}</p>}
                  {m.description && (
                    <p className="text-xs text-ivory/25 mt-1 truncate">{m.description}</p>
                  )}
                </div>
                <svg className="flex-shrink-0 ml-auto text-ivory/20" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add new */}
      {adding ? (
        <MilestoneForm
          weddingId={weddingId}
          adminSecret={adminSecret}
          onSave={handleSave}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-3 text-xs tracking-widest uppercase text-emerald-DEFAULT/50 hover:text-emerald-DEFAULT transition-colors border border-dashed border-emerald-DEFAULT/20 hover:border-emerald-DEFAULT/40 rounded"
          aria-label="Add a new story milestone"
        >
          + Add Milestone
        </button>
      )}
    </div>
  )
}
