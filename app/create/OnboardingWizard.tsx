'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type AccountType = 'couple' | 'planner'

interface Props {
  userEmail: string
  userId: string
}

export function OnboardingWizard({ userEmail }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    businessName: '',
    name1: '',
    name2: '',
    wedding_date: '',
    venue: '',
    city: '',
  })

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSelectType(type: AccountType) {
    setAccountType(type)
    setStep(2)
  }

  const isValid = form.name1.trim() && form.name2.trim() && form.wedding_date && form.venue.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !accountType) return

    setLoading(true)
    setError('')

    try {
      await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_type: accountType,
          business_name: accountType === 'planner' ? form.businessName.trim() : null,
        }),
      })

      const res = await fetch('/api/weddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name1: form.name1,
          name2: form.name2,
          wedding_date: form.wedding_date,
          venue: form.venue,
          city: form.city,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      router.push(`/studio/${data.slug}`)
    } catch {
      setError('Network error. Please check your connection.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center mb-10">
        {[1, 2].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-body transition-colors ${
              step >= n
                ? 'bg-gold text-obsidian'
                : 'bg-white/5 text-ivory/30 border border-white/10'
            }`}>
              {step > n ? '✓' : n}
            </div>
            {n < 2 && <div className={`w-12 h-px transition-colors ${step > n ? 'bg-gold/50' : 'bg-white/5'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <AccountTypeStep onSelect={handleSelectType} userEmail={userEmail} />
      )}

      {step === 2 && accountType && (
        <WeddingDetailsStep
          accountType={accountType}
          form={form}
          error={error}
          loading={loading}
          userEmail={userEmail}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onBack={() => setStep(1)}
        />
      )}
    </div>
  )
}

function AccountTypeStep({
  onSelect,
  userEmail,
}: {
  onSelect: (type: AccountType) => void
  userEmail: string
}) {
  return (
    <div>
      <div className="text-center mb-10">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">
          Step 1 of 2 - Who are you?
        </p>
        <h1 className="font-display text-4xl text-ivory mb-3">How are you using Save The Day?</h1>
        <p className="font-body text-ivory/40 text-sm">
          Signed in as <span className="text-ivory/60">{userEmail}</span>
        </p>
      </div>

      <div className="grid gap-4">
        <button
          onClick={() => onSelect('couple')}
          className="group text-left p-6 border border-white/10 hover:border-gold/40 rounded-sm transition-colors"
          style={{ background: 'rgba(255,255,255,0.01)' }}
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5">💍</span>
            <div>
              <h2 className="font-display text-xl text-ivory group-hover:text-gold transition-colors mb-1">
                I&apos;m planning my own wedding
              </h2>
              <p className="font-body text-ivory/40 text-sm leading-relaxed">
                Create a Save-the-Date page for your wedding and invite your guests.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect('planner')}
          className="group text-left p-6 border border-white/10 hover:border-gold/40 rounded-sm transition-colors"
          style={{ background: 'rgba(255,255,255,0.01)' }}
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5">📋</span>
            <div>
              <h2 className="font-display text-xl text-ivory group-hover:text-gold transition-colors mb-1">
                I&apos;m a wedding planner
              </h2>
              <p className="font-body text-ivory/40 text-sm leading-relaxed">
                Manage Save-the-Date pages for multiple clients from one dashboard.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

function WeddingDetailsStep({
  accountType,
  form,
  error,
  loading,
  userEmail,
  onChange,
  onSubmit,
  onBack,
}: {
  accountType: AccountType
  form: Record<string, string>
  error: string
  loading: boolean
  userEmail: string
  onChange: (field: string, value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onBack: () => void
}) {
  const isPlanner = accountType === 'planner'
  const isValid = form.name1.trim() && form.name2.trim() && form.wedding_date && form.venue.trim()

  return (
    <div>
      <div className="text-center mb-10">
        <p className="font-body text-gold text-xs tracking-[0.3em] uppercase mb-3">
          Step 2 of 2 - {isPlanner ? 'First client wedding' : 'Your wedding'}
        </p>
        <h1 className="font-display text-4xl text-ivory mb-3">
          {isPlanner ? 'Set up your first client' : 'Tell us about your wedding'}
        </h1>
        <p className="font-body text-ivory/40 text-sm leading-relaxed">
          {isPlanner
            ? 'You can add more clients anytime from your planner dashboard.'
            : 'Just the basics. Add photos and guests from your dashboard.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {error && (
          <div className="px-4 py-3 border border-red-500/20 bg-red-500/5 rounded-sm">
            <p className="font-body text-red-400 text-xs">{error}</p>
          </div>
        )}

        <div className="px-4 py-3 border border-white/5 rounded-sm flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <p className="font-body text-ivory/40 text-xs">
            {isPlanner ? 'Wedding planner account' : 'Couple account'} ·{' '}
            <span className="text-ivory/60">{userEmail}</span>
          </p>
        </div>

        {isPlanner && (
          <div>
            <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-2">
              Your business / brand name
            </label>
            <input
              type="text"
              value={form.businessName}
              onChange={e => onChange('businessName', e.target.value)}
              placeholder="e.g. Bloom Events Co."
              className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
            />
          </div>
        )}

        <div>
          <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-2">
            {isPlanner ? "Client's names" : 'Couple names'}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name1}
              onChange={e => onChange('name1', e.target.value)}
              required
              placeholder={isPlanner ? 'Partner 1' : 'Your name'}
              className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
            />
            <input
              type="text"
              value={form.name2}
              onChange={e => onChange('name2', e.target.value)}
              required
              placeholder={isPlanner ? 'Partner 2' : "Partner's name"}
              className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
            />
          </div>
          {form.name1 && form.name2 && (
            <p className="font-body text-ivory/20 text-xs mt-2 tracking-wide">
              Invitation URL: /e/{slugPreview(form.name1, form.name2)}
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
            onChange={e => onChange('wedding_date', e.target.value)}
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
            onChange={e => onChange('venue', e.target.value)}
            required
            placeholder="e.g. The Grand Ballroom"
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
            onChange={e => onChange('city', e.target.value)}
            placeholder="e.g. London, New York, Lagos"
            className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onBack}
            className="font-body border border-white/10 text-ivory/40 hover:text-ivory/60 text-sm tracking-wide px-5 py-3 transition-colors rounded-sm"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || !isValid}
            className="flex-1 bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-obsidian font-body text-sm tracking-widest uppercase px-6 py-3 transition-colors rounded-sm"
          >
            {loading
              ? 'Creating...'
              : isPlanner
                ? 'Create client event'
                : 'Create my wedding'}
          </button>
        </div>
      </form>
    </div>
  )
}

function slugPreview(name1: string, name2: string): string {
  const clean = (s: string) =>
    s.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 15)
  return `${clean(name1)}-${clean(name2)}`
}
