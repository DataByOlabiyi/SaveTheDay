'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Guest } from '@/lib/db/types'

interface AddGuestModalProps {
  weddingId: string
  adminSecret: string
  onClose: () => void
  onSuccess: (guest: Guest) => void   // returns the newly created guest
}

export function AddGuestModal({
  weddingId,
  adminSecret,
  onClose,
  onSuccess,
}: AddGuestModalProps) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: adminSecret,
          weddingId,
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      })

      const data = await res.json().catch(() => ({ error: `HTTP ${res.status} — empty response` }))

      if (!res.ok) {
        const detail = [data.error, data.code, data.details].filter(Boolean).join(' · ')
        setError(detail || `Error ${res.status}`)
        return
      }

      // Pass the full guest object back to the parent so the list can update instantly
      onSuccess(data.guest as Guest)
    } catch (err) {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="add-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="add-panel"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-md bg-[#151518] border border-white/10 pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-start justify-between">
            <div>
              <h2
                className="font-display text-ivory/85 font-light tracking-wider"
                style={{ fontSize: '1.15rem' }}
              >
                Add Guest
              </h2>
              <p className="text-xs text-ivory/25 mt-1 tracking-wider">
                A personalised invitation link will be generated
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-ivory/20 hover:text-ivory/50 transition-colors mt-0.5"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs tracking-widest uppercase text-ivory/30 mb-1.5">
                Full Name <span className="text-gold-DEFAULT/70">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Temi Johnson"
                required
                autoFocus
                className="w-full bg-white/5 border border-white/10 text-ivory text-sm px-3 py-2.5 placeholder-ivory/15 focus:outline-none focus:border-gold-DEFAULT/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-ivory/30 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="temi@example.com"
                className="w-full bg-white/5 border border-white/10 text-ivory text-sm px-3 py-2.5 placeholder-ivory/15 focus:outline-none focus:border-gold-DEFAULT/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-ivory/30 mb-1.5">
                Phone / WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+2348012345678"
                className="w-full bg-white/5 border border-white/10 text-ivory text-sm px-3 py-2.5 placeholder-ivory/15 focus:outline-none focus:border-gold-DEFAULT/40 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400/80 text-xs tracking-wider break-words">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-xs tracking-widest uppercase text-ivory/30 border border-white/10 hover:border-white/20 hover:text-ivory/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex-1 py-2.5 text-xs tracking-widest uppercase bg-gold-DEFAULT/10 text-gold-DEFAULT border border-gold-DEFAULT/20 hover:bg-gold-DEFAULT/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding…' : 'Add Guest'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
