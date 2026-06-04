'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const RESEND_COOLDOWN = 30

function LoginContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/studio'
  const hasError = searchParams.get('error') === 'auth_failed'

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(hasError ? 'Sign-in link expired. Please try again.' : '')
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
      setResendCooldown(RESEND_COOLDOWN)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || loading) return
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
    setLoading(false)
    setResendCooldown(RESEND_COOLDOWN)
  }

  async function handleGoogle() {
    const supabase = createSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center px-6">

      <Link href="/" className="font-display text-gold text-2xl italic tracking-wide mb-12">
        Save The Day
      </Link>

      <div className="w-full max-w-sm">
        {sent ? (
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(201, 168, 76, 0.08)', border: '1px solid rgba(201, 168, 76, 0.2)' }}
            >
              <span className="text-gold text-2xl font-display italic">S</span>
            </div>
            <h1 className="font-display text-2xl text-ivory mb-3">Check your email</h1>
            <p className="font-body text-ivory/40 text-sm leading-relaxed mb-6">
              We sent a sign-in link to{' '}
              <span className="text-ivory/70">{email}</span>.<br />
              Click it to continue.
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="font-body text-gold/70 hover:text-gold text-xs tracking-wide transition-colors disabled:text-ivory/20 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : loading ? 'Sending…' : 'Resend link'}
              </button>
              <button
                onClick={() => setSent(false)}
                className="font-body text-ivory/30 text-xs tracking-wide hover:text-ivory/60 transition-colors"
              >
                Use a different email
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl text-ivory mb-2 text-center">Welcome back</h1>
            <p className="font-body text-ivory/40 text-sm text-center mb-8">
              Sign in to manage your wedding
            </p>

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
                  className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-obsidian font-body text-sm tracking-widest uppercase px-6 py-3 transition-colors rounded-sm"
              >
                {loading ? 'Sending link...' : 'Send magic link'}
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
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-gold/70 hover:text-gold transition-colors">
                Create one free
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
