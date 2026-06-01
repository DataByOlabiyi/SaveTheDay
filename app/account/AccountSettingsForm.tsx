'use client'

import { useState } from 'react'

interface Props {
  userId:              string
  initialAccountType:  'couple' | 'planner'
  initialBusinessName: string
  initialFullName:     string
}

export function AccountSettingsForm({
  initialAccountType,
  initialBusinessName,
  initialFullName,
}: Props) {
  const [accountType,  setAccountType]  = useState<'couple' | 'planner'>(initialAccountType)
  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [fullName,     setFullName]     = useState(initialFullName)
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/account', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_type:  accountType,
          business_name: accountType === 'planner' ? businessName.trim() || null : null,
          full_name:     fullName.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Save failed')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="px-4 py-3 border border-red-500/20 bg-red-500/5 rounded-sm">
          <p className="font-body text-red-400 text-xs">{error}</p>
        </div>
      )}

      <div>
        <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-2">
          Full Name
        </label>
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Your full name"
          maxLength={100}
          className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
        />
      </div>

      <div>
        <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-3">
          Account Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['couple', 'planner'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setAccountType(type)}
              className={`p-4 border rounded-sm text-left transition-colors ${
                accountType === type
                  ? 'border-gold/40 bg-gold/5'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <p className={`font-display text-sm mb-1 capitalize ${accountType === type ? 'text-gold' : 'text-ivory/60'}`}>
                {type === 'couple' ? '💍 Couple' : '📋 Planner'}
              </p>
              <p className="font-body text-ivory/30 text-xs leading-relaxed">
                {type === 'couple'
                  ? 'Planning your own wedding'
                  : 'Managing client weddings'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {accountType === 'planner' && (
        <div>
          <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-2">
            Business / Brand Name
          </label>
          <input
            type="text"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="e.g. Lagos Wedding Co."
            maxLength={100}
            className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-obsidian font-body text-sm tracking-widest uppercase px-6 py-3 transition-colors rounded-sm"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
      </button>
    </form>
  )
}
