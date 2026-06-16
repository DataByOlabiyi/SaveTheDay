'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

function friendlyError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  return 'Something went wrong. Please try again.'
}

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail]                     = useState('')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const passwordsMatch   = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit = email && meetsAllRequirements(password) && passwordsMatch && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!meetsAllRequirements(password)) {
      setError('Please meet all password requirements before continuing.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/studio`,
      },
    })

    if (authError) {
      setLoading(false)
      setError(friendlyError(authError.message))
      return
    }

    if (data.session) {
      await fetch('/api/auth/sync-profile', { method: 'POST' })
      router.push('/create')
      router.refresh()
    } else {
      setLoading(false)
      setAwaitingConfirm(true)
    }
  }

  async function handleGoogle() {
    const supabase = createSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/create')}`
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center px-6">

      <Link href="/" className="font-display text-gold text-2xl italic tracking-wide mb-12">
        Save The Day
      </Link>

      <div className="w-full max-w-sm">
        {awaitingConfirm ? (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(201, 168, 76, 0.08)', border: '1px solid rgba(201, 168, 76, 0.2)' }}
            >
              <span className="text-gold text-2xl font-display italic">S</span>
            </div>
            <h1 className="font-display text-2xl text-ivory mb-3">Check your email</h1>
            <p className="font-body text-ivory/40 text-sm leading-relaxed mb-6">
              We sent a confirmation link to{' '}
              <span className="text-ivory/70">{email}</span>.<br />
              Click it to activate your account, then return to the app to get started.
            </p>
            <Link
              href="/login"
              className="font-body text-gold/70 hover:text-gold text-xs tracking-wide transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl text-ivory mb-2">Create your account</h1>
              <p className="font-body text-ivory/40 text-sm">
                Free forever. No credit card needed.
              </p>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 border border-red-500/20 bg-red-500/5 rounded-sm">
                <p className="font-body text-red-400 text-xs">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
                />
              </div>

              <div>
                <PasswordInput
                  label="Password"
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
                  label="Confirm password"
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
                {loading ? 'Creating account…' : 'Get started'}
              </button>
            </form>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/5" />
              <span className="font-body text-ivory/20 text-xs">or</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <button
              onClick={handleGoogle}
              className="w-full border border-white/10 hover:border-white/20 text-ivory/60 hover:text-ivory font-body text-sm tracking-wide px-6 py-3 transition-colors rounded-sm flex items-center justify-center gap-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p className="font-body text-ivory/20 text-xs text-center mt-8">
              Already have an account?{' '}
              <Link href="/login" className="text-gold/70 hover:text-gold transition-colors">
                Sign in
              </Link>
            </p>

            <p className="font-body text-ivory/20 text-xs text-center mt-4 leading-relaxed">
              By creating an account you agree to our{' '}
              <Link href="/terms" className="underline underline-offset-2 hover:text-ivory/40 transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-ivory/40 transition-colors">
                Privacy Policy
              </Link>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
