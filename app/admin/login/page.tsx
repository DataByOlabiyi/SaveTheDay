'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import PasswordInput from '@/components/atoms/PasswordInput'

const NEXT = '/admin'

function friendlyError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Please try again.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email address first. Check your inbox.'
  }
  return 'Something went wrong. Please try again.'
}

function AdminLoginForm() {
  const router = useRouter()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createSupabaseBrowserClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (authError) {
      setError(friendlyError(authError.message))
    } else {
      router.push(NEXT)
      router.refresh()
    }
  }

  async function handleGoogle() {
    const supabase = createSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(NEXT)}`
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  }

  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center px-6">
      <div className="mb-12 text-center">
        <Link href="/" className="font-display text-gold text-2xl italic tracking-wide">
          Save The Day
        </Link>
        <div className="mt-2">
          <span
            className="font-body text-[10px] tracking-[0.25em] uppercase px-2.5 py-1 rounded-sm"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}
          >
            Admin Portal
          </span>
        </div>
      </div>

      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-ivory mb-2 text-center">Team sign in</h1>
        <p className="font-body text-ivory/40 text-sm text-center mb-8">
          Access is restricted to authorised team members
        </p>

        {error && (
          <div className="mb-6 px-4 py-3 border border-red-500/20 bg-red-500/5 rounded-sm">
            <p className="font-body text-red-400 text-xs">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-body text-ivory/40 text-xs tracking-widest uppercase block mb-2">
              Team email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@savetheday.dev"
              className="w-full bg-white/5 border border-white/10 focus:border-gold/50 text-ivory font-body text-sm px-4 py-3 rounded-sm outline-none transition-colors placeholder:text-ivory/20"
            />
          </div>

          <PasswordInput
            label="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            rightLabel={
              <Link href="/forgot-password" className="font-body text-gold/50 text-xs hover:text-gold transition-colors">
                Forgot password?
              </Link>
            }
          />

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-obsidian font-body text-sm tracking-widest uppercase px-6 py-3 transition-colors rounded-sm"
          >
            {loading ? 'Signing in…' : 'Sign in'}
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
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return <Suspense><AdminLoginForm /></Suspense>
}
