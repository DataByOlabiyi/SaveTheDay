'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AccountDangerZone() {
  const router = useRouter()
  const [step,  setStep]  = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setStep('deleting')
    setError(null)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Deletion failed')
      }
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
      setStep('confirm')
    }
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
          onClick={() => setStep('confirm')}
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
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              className="font-body text-sm text-red-400 border border-red-500/40 hover:border-red-500/60 px-4 py-2 rounded-sm transition-colors"
            >
              Yes, delete my account
            </button>
            <button
              onClick={() => setStep('idle')}
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
