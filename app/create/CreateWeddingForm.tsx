'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  userEmail: string
}

export function CreateWeddingForm({ userEmail }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name1: '',
    name2: '',
    wedding_date: '',
    venue: '',
    city: 'Lagos',
  })

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isValid = form.name1.trim() && form.name2.trim() && form.wedding_date && form.venue.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/weddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      router.push(`/studio/${data.slug}`)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {error && (
        <div className="px-4 py-3 border border-red-500/20 bg-red-500/5 rounded-sm">
          <p className="font-body text-red-400 text-xs">{error}</p>
        </div>
      )}

      <div className="px-4 py-3 border border-white/5 rounded-sm flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <p className="font-body text-ivory/40 text-xs">
          Creating for <span className="text-ivory/70">{userEmail}</span>
        </p>
      </div>

      <div>
        <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-3">
          Couple names
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={form.name1}
            onChange={e => handleChange('name1', e.target.value)}
            required
            placeholder="Partner 1"
            className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
          />
          <input
            type="text"
            value={form.name2}
            onChange={e => handleChange('name2', e.target.value)}
            required
            placeholder="Partner 2"
            className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
          />
        </div>
        {form.name1 && form.name2 && (
          <p className="font-body text-ivory/20 text-xs mt-2 tracking-wide">
            Page URL will be: /e/{slugPreview(form.name1, form.name2)}
          </p>
        )}
      </div>

      <div>
        <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-2">
          Wedding date
        </label>
        <input
          type="date"
          value={form.wedding_date}
          onChange={e => handleChange('wedding_date', e.target.value)}
          required
          min={new Date().toISOString().split('T')[0]}
          className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors [color-scheme:dark]"
        />
      </div>

      <div>
        <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-2">
          Venue name
        </label>
        <input
          type="text"
          value={form.venue}
          onChange={e => handleChange('venue', e.target.value)}
          required
          placeholder="e.g. Eko Hotel & Suites"
          className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
        />
      </div>

      <div>
        <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-2">
          City
        </label>
        <input
          type="text"
          value={form.city}
          onChange={e => handleChange('city', e.target.value)}
          placeholder="Lagos"
          className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !isValid}
        className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-obsidian font-body text-sm tracking-widest uppercase px-6 py-4 transition-colors rounded-sm mt-2"
      >
        {loading ? 'Creating your wedding...' : 'Create & go to dashboard'}
      </button>

      <p className="font-body text-ivory/20 text-xs text-center leading-relaxed">
        You&apos;ll add photos, guest list, and more from your dashboard.
        Your page won&apos;t go live until you publish it.
      </p>
    </form>
  )
}

function slugPreview(name1: string, name2: string): string {
  const clean = (s: string) =>
    s.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 20)
  return `${clean(name1)}-${clean(name2)}`
}
