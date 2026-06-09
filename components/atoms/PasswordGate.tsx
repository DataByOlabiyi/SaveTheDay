'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface PasswordGateProps {
  slug:         string
  coupleName1:  string
  coupleName2:  string
  children:     React.ReactNode
}

export function PasswordGate({ slug, coupleName1, coupleName2, children }: PasswordGateProps) {
  const STORAGE_KEY = `stv_unlocked_${slug}`

  const [unlocked, setUnlocked] = useState(false)
  const [ready,    setReady]    = useState(false)  // true once sessionStorage has been read
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(STORAGE_KEY) === '1')
    setReady(true)
  }, [STORAGE_KEY])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError('')

    try {
      const res  = await fetch('/api/wedding/verify-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug, password }),
      })
      const data = await res.json()

      if (data.valid) {
        sessionStorage.setItem(STORAGE_KEY, '1')
        setUnlocked(true)
      } else {
        setError('Incorrect password. Please try again.')
        setPassword('')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Avoid flash — hold until sessionStorage is read
  if (!ready) return null

  if (unlocked) return <>{children}</>

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Heading */}
        <div className="text-center mb-8">
          <p
            className="font-display text-3xl italic mb-3"
            style={{ color: 'rgba(201,168,76,0.9)' }}
          >
            {coupleName1} &amp; {coupleName2}
          </p>

          {/* Gold hairline divider */}
          <div className="flex items-center gap-3 max-w-[100px] mx-auto mb-4">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4))' }} />
            <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(201,168,76,0.7)' }} />
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }} />
          </div>

          <p className="font-body text-ivory/40 text-sm leading-relaxed">
            This invitation is private.<br />Enter the password to view it.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
            className="rsvp-input w-full text-center"
            style={{ letterSpacing: '0.2em' }}
          />

          {error && (
            <p className="text-center font-body text-xs text-red-400">{error}</p>
          )}

          <motion.button
            type="submit"
            disabled={loading || !password.trim()}
            whileTap={{ scale: 0.98 }}
            className="btn-gold w-full py-3 font-body text-xs tracking-widest uppercase"
          >
            {loading ? 'Verifying…' : 'Enter'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
