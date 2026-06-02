'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import type { EventScheduleItem } from '@/lib/db/types'

interface ScheduleEditorProps {
  weddingId: string
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const CARD  = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
const INPUT = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }
const GHOST = { background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 16 }

const EMOJI_SUGGESTIONS = ['🥂', '💒', '💍', '🎵', '🍽️', '💃', '📸', '🎤', '🌸', '🚗', '🎊', '👰', '🤵', '🕯️', '🎂', '✈️']

const DEFAULT_ITEMS = [
  { title: 'Guests Arrive',    time_label: '1:30 PM', emoji: '🥂', sort_order: 1 },
  { title: 'Ceremony',         time_label: '2:00 PM', emoji: '💒', sort_order: 2 },
  { title: 'Cocktail Hour',    time_label: '3:30 PM', emoji: '🍸', sort_order: 3 },
  { title: 'Reception Opens',  time_label: '5:00 PM', emoji: '🎊', sort_order: 4 },
  { title: 'Dinner Service',   time_label: '6:00 PM', emoji: '🍽️', sort_order: 5 },
  { title: 'First Dance',      time_label: '8:00 PM', emoji: '💃', sort_order: 6 },
]

// ── Shared inputs ──────────────────────────────────────────────────────────────

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

// ── Drag handle ────────────────────────────────────────────────────────────────

function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <div
      onPointerDown={e => controls.start(e)}
      className="cursor-grab active:cursor-grabbing touch-none p-1 text-ivory/20 hover:text-ivory/50 transition-colors shrink-0"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
        <circle cx="5" cy="4" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="12" r="1.2" />
        <circle cx="11" cy="4" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="12" r="1.2" />
      </svg>
    </div>
  )
}

// ── Single schedule item card ──────────────────────────────────────────────────

function ScheduleItemCard({
  item,
  onSave,
  onDelete,
}: {
  item: EventScheduleItem
  onSave: (updated: EventScheduleItem) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const dragControls = useDragControls()
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [draft, setDraft] = useState(item)
  const [showEmojis, setShowEmojis] = useState(false)

  useEffect(() => { setDraft(item) }, [item])

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setExpanded(false)
  }

  async function handleDelete() {
    if (!confirm(`Remove "${item.title}" from the programme?`)) return
    setDeleting(true)
    await onDelete(item.id)
  }

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      as="div"
      className="select-none"
    >
      <div style={CARD} className="overflow-hidden transition-all">
        {/* ── Collapsed row ── */}
        <div className="flex items-center gap-3 px-4 py-3">
          <DragHandle controls={dragControls} />
          <span className="text-xl w-7 text-center shrink-0">{item.emoji ?? '📅'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-body text-xs text-gold/70 tabular-nums shrink-0">{item.time_label}</span>
              <span className="font-body text-sm text-ivory/80 truncate">{item.title}</span>
            </div>
            {item.description && (
              <p className="font-body text-xs text-ivory/35 truncate mt-0.5">{item.description}</p>
            )}
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="font-body text-[11px] text-ivory/30 hover:text-gold/70 transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-white/[0.04]"
          >
            {expanded ? 'Done' : 'Edit'}
          </button>
        </div>

        {/* ── Expanded editor ── */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="editor"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.06]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Time</label>
                    <AdminInput
                      value={draft.time_label}
                      onChange={e => setDraft(d => ({ ...d, time_label: e.target.value }))}
                      placeholder="2:00 PM"
                    />
                  </div>
                  <div>
                    <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Emoji</label>
                    <div className="relative">
                      <AdminInput
                        value={draft.emoji ?? ''}
                        onChange={e => setDraft(d => ({ ...d, emoji: e.target.value }))}
                        placeholder="💒"
                        onFocus={() => setShowEmojis(true)}
                        onBlur={() => setTimeout(() => setShowEmojis(false), 150)}
                      />
                      <AnimatePresence>
                        {showEmojis && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute top-full mt-1 left-0 z-10 flex flex-wrap gap-1 p-2 rounded-xl"
                            style={{ background: 'rgba(20,20,20,0.97)', border: '1px solid rgba(255,255,255,0.1)', width: 200 }}
                          >
                            {EMOJI_SUGGESTIONS.map(e => (
                              <button
                                key={e}
                                onMouseDown={() => setDraft(d => ({ ...d, emoji: e }))}
                                className="text-lg hover:bg-white/10 rounded-lg p-1 transition-colors"
                              >
                                {e}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Title</label>
                  <AdminInput
                    value={draft.title}
                    onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                    placeholder="Ceremony"
                  />
                </div>

                <div>
                  <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Description (optional)</label>
                  <AdminTextarea
                    value={draft.description ?? ''}
                    onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                    placeholder="A short note about this part of the day"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Location (optional)</label>
                  <AdminInput
                    value={draft.location ?? ''}
                    onChange={e => setDraft(d => ({ ...d, location: e.target.value }))}
                    placeholder="Garden terrace"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="font-body text-xs text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    {deleting ? 'Removing…' : 'Remove'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !draft.title.trim() || !draft.time_label.trim()}
                    className="font-body text-xs tracking-widest uppercase px-4 py-2 rounded-xl transition-all disabled:opacity-40"
                    style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  )
}

// ── Main editor ────────────────────────────────────────────────────────────────

export function ScheduleEditor({ weddingId }: ScheduleEditorProps) {
  const [items, setItems] = useState<EventScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({ title: '', time_label: '', emoji: '', description: '', location: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/schedule?weddingId=${weddingId}`)
    const json = await res.json()
    setItems(json.items ?? [])
    setLoading(false)
  }, [weddingId])

  useEffect(() => { load() }, [load])

  async function handleSave(updated: EventScheduleItem) {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weddingId, ...updated }),
    })
    const json = await res.json()
    if (json.item) {
      setItems(prev => prev.map(i => i.id === json.item.id ? json.item : i))
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/schedule?id=${id}&weddingId=${weddingId}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleAdd() {
    if (!newItem.title.trim() || !newItem.time_label.trim()) return
    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 1
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weddingId,
        title: newItem.title.trim(),
        time_label: newItem.time_label.trim(),
        emoji: newItem.emoji.trim() || undefined,
        description: newItem.description.trim() || undefined,
        location: newItem.location.trim() || undefined,
        sort_order: nextOrder,
      }),
    })
    const json = await res.json()
    if (json.item) {
      setItems(prev => [...prev, json.item])
      setNewItem({ title: '', time_label: '', emoji: '', description: '', location: '' })
      setAdding(false)
    }
  }

  async function handleReorder(reordered: EventScheduleItem[]) {
    const updated = reordered.map((item, i) => ({ ...item, sort_order: i + 1 }))
    setItems(updated)
    await Promise.all(
      updated.map(item =>
        fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weddingId, ...item }),
        })
      )
    )
  }

  async function handleSeedDefaults() {
    const results: EventScheduleItem[] = []
    for (const template of DEFAULT_ITEMS) {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId, ...template }),
      })
      const json = await res.json()
      if (json.item) results.push(json.item)
    }
    setItems(results)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 rounded-full border border-gold/30 border-t-gold/80 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">

      {/* ── Empty state ── */}
      {items.length === 0 && !adding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-12 flex flex-col items-center gap-4 text-center"
          style={GHOST}
        >
          <span className="text-4xl">🗓️</span>
          <div>
            <p className="font-body text-ivory/50 text-sm">No programme yet</p>
            <p className="font-body text-ivory/25 text-xs mt-1">Add each part of your day — ceremony, dinner, first dance.</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={handleSeedDefaults}
              className="font-body text-xs tracking-widest uppercase px-4 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.7)' }}
            >
              Use template
            </button>
            <button
              onClick={() => setAdding(true)}
              className="font-body text-xs tracking-widest uppercase px-4 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(250,247,242,0.5)' }}
            >
              Add first item
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Item list ── */}
      {items.length > 0 && (
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="space-y-2"
          as="div"
        >
          <AnimatePresence initial={false}>
            {items.map(item => (
              <ScheduleItemCard
                key={item.id}
                item={item}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* ── Add new item ── */}
      <AnimatePresence>
        {adding && (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={CARD}
            className="p-4 space-y-3"
          >
            <p className="font-body text-xs tracking-widest uppercase text-ivory/30">New programme item</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Time *</label>
                <AdminInput
                  autoFocus
                  value={newItem.time_label}
                  onChange={e => setNewItem(d => ({ ...d, time_label: e.target.value }))}
                  placeholder="2:00 PM"
                />
              </div>
              <div>
                <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Emoji</label>
                <AdminInput
                  value={newItem.emoji}
                  onChange={e => setNewItem(d => ({ ...d, emoji: e.target.value }))}
                  placeholder="💒"
                />
              </div>
            </div>
            <div>
              <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Title *</label>
              <AdminInput
                value={newItem.title}
                onChange={e => setNewItem(d => ({ ...d, title: e.target.value }))}
                placeholder="Ceremony"
              />
            </div>
            <div>
              <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Description (optional)</label>
              <AdminTextarea
                value={newItem.description}
                onChange={e => setNewItem(d => ({ ...d, description: e.target.value }))}
                placeholder="A short note about this part of the day"
                rows={2}
              />
            </div>
            <div>
              <label className="font-body text-[10px] tracking-widest uppercase text-ivory/30 block mb-1.5">Location (optional)</label>
              <AdminInput
                value={newItem.location}
                onChange={e => setNewItem(d => ({ ...d, location: e.target.value }))}
                placeholder="Garden terrace"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { setAdding(false); setNewItem({ title: '', time_label: '', emoji: '', description: '', location: '' }) }}
                className="font-body text-xs text-ivory/30 hover:text-ivory/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newItem.title.trim() || !newItem.time_label.trim()}
                className="font-body text-xs tracking-widest uppercase px-4 py-2 rounded-xl transition-all disabled:opacity-40"
                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}
              >
                Add item
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add button (when items exist) ── */}
      {items.length > 0 && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-3 font-body text-xs tracking-widest uppercase text-ivory/25 hover:text-ivory/50 transition-colors rounded-xl"
          style={GHOST}
        >
          + Add item
        </button>
      )}
    </div>
  )
}
