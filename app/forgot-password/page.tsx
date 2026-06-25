'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const redirectTo = `${window.location.origin}/auth/callback?type=recovery`

    await fetch('/api/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, redirectTo }),
    })

    setLoading(false)
    setSent(true)
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
              If that address is registered, you&apos;ll receive a password reset link shortly.
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
            <h1 className="font-display text-3xl text-ivory mb-2 text-center">Reset password</h1>
            <p className="font-body text-ivory/40 text-sm text-center mb-8">
              Enter your email and we&apos;ll send a reset link
            </p>

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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="font-body text-ivory/20 text-xs text-center mt-8">
              Remember it?{' '}
              <Link href="/login" className="text-gold/70 hover:text-gold transition-colors">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
