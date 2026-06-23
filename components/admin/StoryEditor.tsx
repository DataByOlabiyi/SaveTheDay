'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import type { StoryMilestone } from '@/lib/db/types'

interface StoryEditorProps {
  weddingId:      string
  coupleName1?:   string
  coupleName2?:   string
  onCountChange?: (count: number) => void
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const CARD  = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
const INPUT = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }
const GHOST = { background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16 }

const EMOJI_SUGGESTIONS = ['✨', '☕', '✈️', '💍', '💌', '🥂', '🎉', '💕', '🌸', '🏡', '💒', '🎊']

const DEFAULT_CHAPTERS = [
  { title: 'How We Met',          emoji: '✨', sort_order: 1 },
  { title: 'Our First Date',       emoji: '☕', sort_order: 2 },
  { title: 'First Trip Together',  emoji: '✈️', sort_order: 3 },
  { title: 'The Proposal',         emoji: '💍', sort_order: 4 },
  { title: 'Forever Begins',       emoji: '💌', sort_order: 5 },
]

// ── Shared input component ─────────────────────────────────────────────────────

function AdminInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl font-body text-sm text-ivory/85 placeholder-ivory/25 focus:outline-none focus:border-gold/40 focus:bg-white/[0.06] transition-all ${props.className ?? ''}`}
      style={{ ...INPUT, ...(props.style ?? {}) }}
    />
  )
}

function AdminTextarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl font-body text-sm text-ivory/85 placeholder-ivory/25 focus:outline-none focus:border-gold/40 focus:bg-white/[0.06] transition-all resize-none ${props.className ?? ''}`}
      style={{ ...INPUT, ...(props.style ?? {}) }}
    />
  )
}

// ── Visibility pill ────────────────────────────────────────────────────────────

function VisibilityPill({ visible }: { visible: boolean }) {
  return visible ? (
    <span className="inline-flex items-center gap-1 font-body text-[10px] tracking-wide px-2 py-0.5 rounded-full shrink-0"
      style={{ background: 'rgba(61,217,160,0.08)', border: '1px solid rgba(61,217,160,0.18)', color: '#3DD9A0' }}>
      <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block" />
      Visible
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-body text-[10px] tracking-wide px-2 py-0.5 rounded-full shrink-0"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(250,247,242,0.3)' }}>
      <span className="w-1 h-1 rounded-full bg-white/20 inline-block" />
      Hidden
    </span>
  )
}

// ── Drag handle ───────────────────────────────────────────────────────────────

function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <button
      className="cursor-grab active:cursor-grabbing touch-none text-ivory/20 hover:text-ivory/50 transition-colors p-1 shrink-0"
      onPointerDown={e => controls.start(e)}
      aria-label="Drag to reorder"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9"  cy="5"  r="1.5" /><circle cx="15" cy="5"  r="1.5" />
        <circle cx="9"  cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
        <circle cx="9"  cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
      </svg>
    </button>
  )
}

// ── Milestone edit form ────────────────────────────────────────────────────────

function MilestoneForm({
  milestone, weddingId, onSave, onDelete, onCancel,
}: {
  milestone?:  Partial<StoryMilestone>
  weddingId:   string
  onSave:      (m: StoryMilestone) => void
  onDelete?:   (id: string) => void
  onCancel?:   () => void
}) {
  const [title,    setTitle]    = useState(milestone?.title ?? '')
  const [date,     setDate]     = useState(milestone?.date_label ?? '')
  const [desc,     setDesc]     = useState(milestone?.description ?? '')
  const [emoji,    setEmoji]    = useState(milestone?.emoji ?? '')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const hasContent = desc.trim().length > 0

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/story', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId,
          id: milestone?.id,
          title: title.trim(),
          date_label:  date.trim() || undefined,
          description: desc.trim() || undefined,
          emoji: emoji || undefined,
          sort_order:  milestone?.sort_order ?? 99,
          media_urls:  milestone?.media_urls ?? [],
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed')
      onSave((await res.json()).milestone)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!milestone?.id || !confirm('Delete this chapter?')) return
    setDeleting(true)
    try {
      await fetch(`/api/story?id=${milestone.id}&weddingId=${weddingId}`, { method: 'DELETE' })
      onDelete?.(milestone.id)
    } catch { setError('Failed to delete') }
    finally { setDeleting(false) }
  }

  return (
    <div className="rounded-2xl p-5 space-y-4" style={CARD}>

      {/* Visibility hint */}
      {!hasContent && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl"
          style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-px">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <p className="font-body text-[11px] text-gold/70 leading-relaxed">
            Add a description below to make this chapter visible to your guests.
          </p>
        </div>
      )}

      {/* Emoji row */}
      <div>
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-ivory/30 mb-2">Icon</p>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {EMOJI_SUGGESTIONS.map(e => (
            <button key={e} onClick={() => setEmoji(e === emoji ? '' : e)} aria-label={e} aria-pressed={emoji === e}
              className="w-8 h-8 rounded-lg text-base transition-all hover:scale-110"
              style={emoji === e
                ? { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
              }>
              {e}
            </button>
          ))}
        </div>
        <AdminInput value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 8))} placeholder="Or type any emoji" maxLength={8} />
      </div>

      {/* Title */}
      <div>
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-ivory/30 mb-2">Chapter title *</p>
        <AdminInput value={title} onChange={e => setTitle(e.target.value)} placeholder="The Proposal" maxLength={100} required />
      </div>

      {/* Date */}
      <div>
        <p className="font-body text-[10px] tracking-[0.2em] uppercase text-ivory/30 mb-2">Date or label</p>
        <AdminInput value={date} onChange={e => setDate(e.target.value)} placeholder="February 2021" maxLength={50} />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-body text-[10px] tracking-[0.2em] uppercase text-ivory/30">Story</p>
          <span className="font-body text-[10px] text-ivory/20">{1000 - desc.length} chars left</span>
        </div>
        <AdminTextarea value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Tell the story of this moment — where you were, what you felt, what you said…"
          rows={4} maxLength={1000} />
      </div>

      {error && <p className="font-body text-xs text-red-400">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end pt-1">
        {onCancel && (
          <button onClick={onCancel} className="font-body px-4 py-2 text-xs text-ivory/35 hover:text-ivory/60 transition-colors tracking-wider uppercase">
            Cancel
          </button>
        )}
        {milestone?.id && onDelete && (
          <button onClick={handleDelete} disabled={deleting}
            className="font-body px-4 py-2 text-xs transition-colors rounded-xl"
            style={{ color: 'rgba(248,113,113,0.55)', border: '1px solid rgba(248,113,113,0.15)' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = '#f87171'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.35)' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = 'rgba(248,113,113,0.55)'; (e.target as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.15)' }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
        <button onClick={handleSave} disabled={saving || !title.trim()}
          className="font-body text-obsidian text-xs tracking-widest uppercase px-5 py-2 rounded-xl transition-colors disabled:opacity-40"
          style={{ background: saving || !title.trim() ? '#C9A84C' : '#C9A84C' }}
          onMouseEnter={e => { if (!saving && title.trim()) (e.target as HTMLButtonElement).style.background = '#E8CC7A' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = '#C9A84C' }}
        >
          {saving ? 'Saving…' : milestone?.id ? 'Save' : 'Add Chapter'}
        </button>
      </div>
    </div>
  )
}

// ── Ghost chapter card (empty state suggestion) ────────────────────────────────

function GhostChapter({
  title, emoji, onQuickAdd, isAdding,
}: {
  title:      string
  emoji:      string
  onQuickAdd: () => void
  isAdding:   boolean
}) {
  return (
    <motion.div
      layout
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={GHOST}
    >
      <span className="text-lg opacity-40 select-none shrink-0">{emoji}</span>
      <p className="font-body text-sm text-ivory/30 flex-1 italic">{title}</p>
      <button
        onClick={onQuickAdd}
        disabled={isAdding}
        className="flex items-center gap-1.5 font-body text-xs text-gold/60 hover:text-gold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0"
        style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}
      >
        {isAdding ? (
          <span className="w-3 h-3 rounded-full border border-gold/40 border-t-gold animate-spin" />
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        )}
        Add
      </button>
    </motion.div>
  )
}

// ── Draggable milestone card ───────────────────────────────────────────────────

function MilestoneRow({
  milestone, weddingId, onSave, onDelete,
}: {
  milestone:   StoryMilestone
  weddingId:   string
  onSave:      (m: StoryMilestone) => void
  onDelete:    (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const dragControls = useDragControls()
  const isVisible = !!(milestone.description?.trim())

  return (
    <Reorder.Item value={milestone} dragListener={false} dragControls={dragControls}
      className="list-none" style={{ position: 'relative' }}>
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <MilestoneForm
              milestone={milestone}
              weddingId={weddingId}
              onSave={m => { onSave(m); setEditing(false) }}
              onDelete={onDelete}
              onCancel={() => setEditing(false)}
            />
          </motion.div>
        ) : (
          <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all group"
            style={{ ...CARD, opacity: isVisible ? 1 : 0.65 }}
            onClick={() => setEditing(true)}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setEditing(true)}
            aria-label={`Edit chapter: ${milestone.title}`}
          >
            <DragHandle controls={dragControls} />
            <span className="text-xl shrink-0 mt-0.5 select-none">{milestone.emoji ?? '•'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <p className="font-body text-sm text-ivory/80">{milestone.title}</p>
                <VisibilityPill visible={isVisible} />
              </div>
              {milestone.date_label && (
                <p className="font-body text-xs text-ivory/30 mb-0.5">{milestone.date_label}</p>
              )}
              {isVisible ? (
                <p className="font-body text-xs text-ivory/35 truncate">{milestone.description}</p>
              ) : (
                <p className="font-body text-xs text-gold/45 italic">Tap to add description…</p>
              )}
            </div>
            <svg className="shrink-0 text-ivory/20 mt-0.5 group-hover:text-ivory/40 transition-colors" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function StoryEditor({ weddingId, coupleName1, coupleName2, onCountChange }: StoryEditorProps) {
  const [milestones, setMilestones] = useState<StoryMilestone[]>([])
  const [loading,    setLoading]    = useState(true)
  const [adding,     setAdding]     = useState(false)
  const [quickAdding, setQuickAdding] = useState<number | null>(null)
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // AI generation state
  const [aiPanelOpen,  setAiPanelOpen]  = useState(false)
  const [aiKeywords,   setAiKeywords]   = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError,      setAiError]      = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/story?weddingId=${weddingId}`)
      .then(r => r.json())
      .then(data => setMilestones(data.milestones ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [weddingId])

  useEffect(() => { onCountChange?.(milestones.length) }, [milestones.length, onCountChange])

  const persistOrder = useCallback((ordered: StoryMilestone[]) => {
    if (reorderTimer.current) clearTimeout(reorderTimer.current)
    reorderTimer.current = setTimeout(async () => {
      const orders = ordered.map((m, i) => ({ id: m.id, sort_order: i + 1 }))
      try {
        await fetch('/api/story', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weddingId, orders }),
        })
      } catch { /* silent */ }
    }, 600)
  }, [weddingId])

  const handleAIGenerate = async () => {
    setAiGenerating(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/story', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weddingId, keywords: aiKeywords.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Generation failed')

      // Add each AI milestone to the database
      for (const m of json.milestones) {
        const saveRes = await fetch('/api/story', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            weddingId,
            title:       m.title,
            emoji:       m.emoji,
            date_label:  m.date_label,
            description: m.description,
            sort_order:  milestones.length + json.milestones.indexOf(m) + 1,
            media_urls:  [],
          }),
        })
        if (saveRes.ok) {
          const saved = await saveRes.json()
          setMilestones(prev => [...prev, saved.milestone])
        }
      }
      setAiPanelOpen(false)
      setAiKeywords('')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleReorder = (newOrder: StoryMilestone[]) => {
    setMilestones(newOrder)
    persistOrder(newOrder)
  }

  const handleSave = (updated: StoryMilestone) => {
    setMilestones(prev => {
      const idx = prev.findIndex(m => m.id === updated.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n }
      return [...prev, updated].sort((a, b) => a.sort_order - b.sort_order)
    })
    setAdding(false)
  }

  const handleDelete = (id: string) => setMilestones(prev => prev.filter(m => m.id !== id))

  // One-click add a suggested chapter stub (title + emoji only, no description)
  const handleQuickAdd = async (chapter: typeof DEFAULT_CHAPTERS[number]) => {
    setQuickAdding(chapter.sort_order)
    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId,
          title: chapter.title,
          emoji: chapter.emoji,
          sort_order: milestones.length + 1,
          media_urls: [],
        }),
      })
      if (res.ok) handleSave((await res.json()).milestone)
    } catch { /* silent */ }
    finally { setQuickAdding(null) }
  }

  const visibleCount = milestones.filter(m => m.description?.trim()).length
  const addedTitles  = new Set(milestones.map(m => m.title.toLowerCase()))
  const remainingDefaults = DEFAULT_CHAPTERS.filter(c => !addedTitles.has(c.title.toLowerCase()))

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* AI Generation panel */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.12)' }}>
        <button
          onClick={() => { setAiPanelOpen(v => !v); setAiError(null) }}
          className="w-full flex items-center justify-between px-4 py-3 transition-colors"
          style={{ background: aiPanelOpen ? 'rgba(201,168,76,0.07)' : 'rgba(201,168,76,0.03)' }}
          aria-expanded={aiPanelOpen}
        >
          <div className="flex items-center gap-2.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            <span className="font-body text-xs text-gold/70 tracking-wider uppercase">Generate with AI</span>
          </div>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.4)" strokeWidth="2" strokeLinecap="round"
            style={{ transform: aiPanelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <AnimatePresence>
          {aiPanelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-3 space-y-3" style={{ background: 'rgba(201,168,76,0.03)' }}>
                {coupleName1 && coupleName2 && (
                  <p className="font-body text-xs text-ivory/35">
                    Generating story for <span className="text-ivory/60">{coupleName1} &amp; {coupleName2}</span>
                  </p>
                )}
                <div>
                  <p className="font-body text-[10px] tracking-[0.18em] uppercase text-ivory/25 mb-1.5">
                    Optional context <span className="normal-case">(how you met, favorite memories…)</span>
                  </p>
                  <AdminTextarea
                    value={aiKeywords}
                    onChange={e => setAiKeywords(e.target.value)}
                    placeholder="e.g. met at university, love for travel, proposed in Paris, enjoy hiking…"
                    rows={3}
                    maxLength={300}
                  />
                </div>
                {aiError && (
                  <p className="font-body text-xs text-red-400">{aiError}</p>
                )}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleAIGenerate}
                    disabled={aiGenerating}
                    className="flex items-center gap-2 font-body text-obsidian text-xs tracking-widest uppercase px-4 py-2 rounded-xl transition-colors disabled:opacity-40"
                    style={{ background: '#C9A84C' }}
                    onMouseEnter={e => { if (!aiGenerating) (e.target as HTMLButtonElement).style.background = '#E8CC7A' }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = '#C9A84C' }}
                  >
                    {aiGenerating ? (
                      <>
                        <span className="w-3 h-3 rounded-full border border-obsidian/40 border-t-obsidian animate-spin" />
                        Generating…
                      </>
                    ) : (
                      'Generate 5 Chapters'
                    )}
                  </button>
                  <button
                    onClick={() => { setAiPanelOpen(false); setAiKeywords(''); setAiError(null) }}
                    className="font-body text-xs text-ivory/30 hover:text-ivory/55 transition-colors tracking-wider uppercase"
                  >
                    Cancel
                  </button>
                </div>
                <p className="font-body text-[10px] text-ivory/20 leading-relaxed">
                  AI will generate 5 story chapters. You can edit or delete any of them after.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status line */}
      {milestones.length > 0 && (
        <div className="flex items-center justify-between mb-1">
          <p className="font-body text-xs text-ivory/25">
            {milestones.length} chapter{milestones.length !== 1 ? 's' : ''}
            {' · '}
            <span className={visibleCount > 0 ? 'text-emerald-400/70' : 'text-ivory/20'}>
              {visibleCount} visible to guests
            </span>
          </p>
          {milestones.length > 1 && (
            <p className="font-body text-[10px] text-ivory/20 tracking-wide">Drag to reorder</p>
          )}
        </div>
      )}

      {/* Draggable milestone list */}
      <Reorder.Group axis="y" values={milestones} onReorder={handleReorder}
        className="space-y-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {milestones.map(m => (
          <MilestoneRow
            key={m.id}
            milestone={m}
            weddingId={weddingId}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ))}
      </Reorder.Group>

      {/* Ghost suggestions for chapters not yet added */}
      {remainingDefaults.length > 0 && (
        <motion.div layout className="space-y-2">
          {milestones.length === 0 && (
            <p className="font-body text-xs text-ivory/25 mb-3">
              Suggested chapters — tap <span className="text-gold/60">Add</span> to start, then fill in your story:
            </p>
          )}
          {remainingDefaults.map(chapter => (
            <GhostChapter
              key={chapter.sort_order}
              title={chapter.title}
              emoji={chapter.emoji}
              onQuickAdd={() => handleQuickAdd(chapter)}
              isAdding={quickAdding === chapter.sort_order}
            />
          ))}
        </motion.div>
      )}

      {/* Custom add form */}
      <AnimatePresence>
        {adding ? (
          <motion.div key="add-form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <MilestoneForm weddingId={weddingId} onSave={handleSave} onCancel={() => setAdding(false)} />
          </motion.div>
        ) : (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setAdding(true)}
            className="w-full py-3 font-body text-xs tracking-widest uppercase transition-all rounded-2xl"
            style={{ color: 'rgba(201,168,76,0.45)', border: '1px dashed rgba(201,168,76,0.18)' }}
            whileHover={{ borderColor: 'rgba(201,168,76,0.35)', color: 'rgba(201,168,76,0.75)' }}
            aria-label="Add a custom story chapter"
          >
            + Add custom chapter
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  )
}
