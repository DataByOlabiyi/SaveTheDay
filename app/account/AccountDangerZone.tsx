'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PasswordInput from '@/components/atoms/PasswordInput'

export function AccountDangerZone() {
  const router = useRouter()
  const [step,     setStep]     = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  // Server tells us when a password is required (email+password accounts)
  const [needsPassword, setNeedsPassword] = useState(false)

  const handleDelete = async () => {
    setStep('deleting')
    setError(null)

    const res = await fetch('/api/account', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(password ? { password } : {}),
    })

    if (res.ok) {
      router.push('/')
      return
    }

    const data = await res.json().catch(() => ({}))

    if (data.requiresPassword) {
      // First attempt told us a password is needed — show the password field
      setNeedsPassword(true)
      setStep('confirm')
      setError(null)
      return
    }

    setError(data.error ?? 'Failed to delete account')
    setStep('confirm')
  }

  const handleConfirmClick = () => {
    setStep('confirm')
    setNeedsPassword(false)
    setPassword('')
    setError(null)
  }

  return (
    <div className="mt-8 pt-8 border-t border-red-500/10">
      <p className="font-body text-ivory/30 text-xs tracking-widest uppercase mb-3">Danger Zone</p>

      {error && (
        <div className="mb-3 px-4 py-3 border border-red-500/20 bg-red-500/5 rounded-sm">
          <p className="font-body text-red-400 text-xs">{error}</p>
        </div>
      )}

      {step === 'idle' && (
        <button
          onClick={handleConfirmClick}
          className="font-body text-sm text-red-400/60 hover:text-red-400 transition-colors tracking-wide"
        >
          Delete account…
        </button>
      )}

      {step === 'confirm' && (
        <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-sm space-y-3">
          <p className="font-body text-ivory/60 text-sm leading-relaxed">
            This permanently deletes your account and all weddings, guests, and photos.
            This cannot be undone.
          </p>

          {needsPassword && (
            <div>
              <PasswordInput
                label="Confirm your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={needsPassword && !password}
              className="font-body text-sm text-red-400 border border-red-500/40 hover:border-red-500/60 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-sm transition-colors"
            >
              Yes, delete my account
            </button>
            <button
              onClick={() => { setStep('idle'); setPassword(''); setNeedsPassword(false); setError(null) }}
              className="font-body text-sm text-ivory/40 hover:text-ivory/70 px-4 py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'deleting' && (
        <p className="font-body text-ivory/30 text-sm">Deleting account…</p>
      )}
    </div>
  )
}
