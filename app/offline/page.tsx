'use client'

import { useEffect, useState } from 'react'

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Offline Fallback Page
// Shown by the service worker when a navigation request fails
// because the device is offline and the page isn't cached.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    // Check initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Reload to serve the intended page once connection is restored
      window.location.reload()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <main
      className="min-h-screen bg-obsidian flex flex-col items-center justify-center px-6 text-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, rgba(12,168,110,0.06) 0%, #080C0A 70%)',
      }}
    >
      {/* â”€â”€ Brand monogram â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="relative mb-10">
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full animate-pulse-emerald"
          style={{
            background: 'radial-gradient(ellipse, rgba(12,168,110,0.12) 0%, transparent 70%)',
            transform: 'scale(1.6)',
          }}
        />
        {/* Icon container */}
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(12,168,110,0.06)',
            border: '1px solid rgba(12,168,110,0.2)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-96.png"
            alt="Save The Day"
            width={48}
            height={48}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* â”€â”€ Ornamental divider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-center gap-3 mb-8 opacity-30">
        <div className="h-px w-16 bg-gold" />
        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
        <div className="h-px w-16 bg-gold" />
      </div>

      {/* â”€â”€ Heading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <h1
        className="font-display text-ivory mb-3"
        style={{
          fontSize: 'clamp(1.75rem, 6vw, 2.5rem)',
          fontStyle: 'italic',
          fontWeight: 300,
          letterSpacing: '0.04em',
          lineHeight: 1.2,
        }}
      >
        You&rsquo;re offline
      </h1>

      {/* â”€â”€ Sub-copy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <p
        className="font-body text-ivory/50 mb-10 max-w-xs"
        style={{ fontSize: '0.9rem', letterSpacing: '0.04em', lineHeight: 1.7 }}
      >
        Your invitation will be right here the moment your connection returns.
      </p>

      {/* â”€â”€ Connection status pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full mb-10"
        style={{
          background: isOnline
            ? 'rgba(12,168,110,0.12)'
            : 'rgba(201,168,76,0.08)',
          border: `1px solid ${isOnline ? 'rgba(12,168,110,0.3)' : 'rgba(201,168,76,0.2)'}`,
        }}
      >
        {/* Status dot */}
        <span
          className={isOnline ? 'animate-pulse-emerald' : ''}
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isOnline ? '#0CA86E' : '#C9A84C',
          }}
        />
        <span
          className="font-body text-ivory/70"
          style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}
        >
          {isOnline ? 'Reconnecting...' : 'No connection'}
        </span>
      </div>

      {/* â”€â”€ Retry button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <button
        onClick={() => window.location.reload()}
        className="font-body transition-all duration-300"
        style={{
          padding: '0.75rem 2.5rem',
          borderRadius: '0.25rem',
          border: '1px solid rgba(12,168,110,0.4)',
          background: 'rgba(12,168,110,0.08)',
          color: '#3DD9A0',
          fontSize: '0.8125rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(12,168,110,0.18)'
          e.currentTarget.style.borderColor = 'rgba(12,168,110,0.7)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(12,168,110,0.08)'
          e.currentTarget.style.borderColor = 'rgba(12,168,110,0.4)'
        }}
      >
        Try again
      </button>

      {/* â”€â”€ Footer note â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <p
        className="font-body text-ivory/20 mt-14"
        style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
      >
        Save The Day &mdash; Luxury Digital Invitations
      </p>
    </main>
  )
}

