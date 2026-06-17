'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import PasswordInput from '@/components/atoms/PasswordInput'
import PasswordStrength from '@/components/atoms/PasswordStrength'

function meetsAllRequirements(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  )
}

export function AdminChangePasswordForm() {
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const canSubmit      = meetsAllRequirements(password) && passwordsMatch && !saving

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!meetsAllRequirements(password)) {
      setError('Please meet all password requirements.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    setError(null)

    const supabase = createSupabaseBrowserClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      setPassword('')
      setConfirmPassword('')
      setTimeout(() => setSaved(false), 4000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="px-4 py-3 border border-red-500/20 bg-red-500/5 rounded-sm">
          <p className="font-body text-red-400 text-xs">{error}</p>
        </div>
      )}

      {saved && (
        <div className="px-4 py-3 border border-green-500/20 bg-green-500/5 rounded-sm">
          <p className="font-body text-green-400 text-xs">Password updated successfully.</p>
        </div>
      )}

      <div>
        <PasswordInput
          label="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <PasswordStrength password={password} />
      </div>

      <div>
        <PasswordInput
          label="Confirm new password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Repeat your password"
          required
          autoComplete="new-password"
        />
        {confirmPassword.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {passwordsMatch ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 shrink-0">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="font-body text-xs text-green-400">Passwords match</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                <span className="font-body text-xs text-red-400">Passwords don&apos;t match</span>
              </>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-obsidian font-body text-sm tracking-widest uppercase px-6 py-3 transition-colors rounded-sm"
      >
        {saving ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
