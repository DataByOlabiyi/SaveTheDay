'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  generateICS,
  downloadFile,
  buildGoogleCalendarUrl,
  buildOutlookUrl,
  type CalendarEventParams,
} from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Platform detection (client-side only)
// ──────────────────────────────────────────────────────────────
type Platform = 'ios' | 'android' | 'desktop'

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua))          return 'android'
  return 'desktop'
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
interface AddToCalendarButtonProps extends CalendarEventParams {
  className?: string
  /** Button label override */
  label?: string
}

export function AddToCalendarButton({
  className = '',
  label = 'Add to Calendar',
  ...eventParams
}: AddToCalendarButtonProps) {
  const [open, setOpen]         = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const containerRef            = useRef<HTMLDivElement>(null)

  // Detect platform after hydration
  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // ── Actions ──────────────────────────────────────────────────

  const handleApple = () => {
    const ics = generateICS(eventParams)
    downloadFile(ics, 'save-the-date.ics', 'text/calendar')
    setOpen(false)
  }

  const handleGoogle = () => {
    window.open(buildGoogleCalendarUrl(eventParams), '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const handleOutlook = () => {
    window.open(buildOutlookUrl(eventParams), '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const handleICS = () => {
    const ics = generateICS(eventParams)
    downloadFile(ics, 'save-the-date.ics', 'text/calendar')
    setOpen(false)
  }

  // ── Options ordered by platform relevance ────────────────────

  const allOptions = [
    {
      key:      'apple',
      label:    'Apple Calendar',
      icon:     <AppleIcon />,
      action:   handleApple,
      // Native .ics prompt on iOS; good on macOS too
      primary:  platform === 'ios',
    },
    {
      key:     'google',
      label:   'Google Calendar',
      icon:    <GoogleIcon />,
      action:  handleGoogle,
      primary: platform === 'android',
    },
    {
      key:    'outlook',
      label:  'Outlook',
      icon:   <OutlookIcon />,
      action: handleOutlook,
    },
    {
      key:    'ics',
      label:  'Download .ics',
      icon:   <DownloadIcon />,
      action: handleICS,
      // On mobile there's already Apple / Google so this is desktop-only visible
      hideOn: ['ios', 'android'] as Platform[],
    },
  ]

  const visibleOptions = allOptions.filter(o => !o.hideOn?.includes(platform))

  // ── On iOS: skip the menu — tap immediately downloads .ics ──
  // (iOS Safari shows a native "Add to Calendar" system sheet)
  if (platform === 'ios') {
    return (
      <button
        onClick={handleApple}
        className={`btn-outline-gold py-3 flex items-center justify-center gap-2 text-xs w-full ${className}`}
      >
        <AppleIcon />
        {label}
      </button>
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="btn-outline-gold py-3 flex items-center justify-center gap-2 text-xs w-full"
      >
        <CalendarIcon />
        {label}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          <ChevronIcon />
        </motion.span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Choose your calendar app"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full mb-2 left-0 right-0 z-50 py-1 overflow-hidden"
            style={{
              background:   '#111A15',
              border:       '1px solid rgba(12, 168, 110, 0.18)',
              borderRadius: '4px',
              boxShadow:    '0 -8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {visibleOptions.map(opt => (
              <li key={opt.key} role="option">
                <button
                  onClick={opt.action}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                >
                  <span className="text-emerald-DEFAULT/70 flex-shrink-0">
                    {opt.icon}
                  </span>
                  <span
                    className="font-body text-ivory/70 text-xs tracking-wider"
                    style={{ letterSpacing: '0.06em' }}
                  >
                    {opt.label}
                  </span>
                  {opt.primary && (
                    <span
                      className="ml-auto font-body text-emerald-DEFAULT/50"
                      style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}
                    >
                      Recommended
                    </span>
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Icons (inline SVG — no extra dependency)
// ──────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8"  y1="2" x2="8"  y2="6" />
      <line x1="3"  y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.8 0 290.3 0 210.7 0 78.4 91.5 7.3 181.5 7.3c49.5 0 91.7 33.7 123.5 33.7 30.3 0 77.4-36.4 133.5-36.4 26.4 0 108.2 2.6 166.3 96.7zm-310.1-161c13-16.3 20.8-39.6 20.8-62.6 0-3.2-.3-6.4-.6-9.7-19.8 .7-43.6 13.2-57.8 30.8-12.3 14.6-22.8 37.8-22.8 61.4 0 3.5 .6 7 .9 8.2 1.3 .2 3.2 .5 5.2 .5 17.8 0 40.2-12 54.3-28.6z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function OutlookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.1V2.55q0-.44.3-.75.3-.3.74-.3h12.76q.44 0 .75.3.3.3.3.75V10.85l1.24.72h.01q.07.04.11.1.04.06.04.13zM7.01 15.63q.38.35.77.56.38.2.79.28.42.08.84.08.54 0 .98-.15.44-.15.75-.39.31-.24.5-.59.19-.34.19-.75 0-.47-.19-.81-.2-.35-.49-.61-.3-.26-.67-.45-.37-.19-.75-.36-.35-.16-.66-.33-.31-.17-.52-.37-.22-.2-.33-.45-.12-.24-.12-.56 0-.28.09-.51.1-.22.27-.39.17-.17.43-.27.26-.1.58-.1.29 0 .57.08.28.08.55.22.27.14.5.34.24.2.45.44l.76-.68q-.32-.37-.7-.64-.37-.26-.8-.42-.42-.16-.87-.23-.46-.07-.93-.07-.5 0-.97.13-.46.14-.8.4-.35.26-.56.63-.21.37-.21.87 0 .42.14.74.15.32.39.56.23.24.56.43.33.18.72.33.51.2.91.39.4.19.68.41.28.21.43.49.15.28.15.68 0 .32-.11.59-.1.27-.31.47-.2.2-.5.31-.3.12-.7.12-.44 0-.86-.16-.42-.16-.78-.43-.36-.27-.63-.62-.27-.35-.41-.73l-.88.56q.2.47.52.88zm9.74-8.06H8.33v1.16h2.13V15h1.22V8.73h2.13V7.57h.02zm3.13 0h-1.21V15h1.21V7.57zm2.5 0h-1.22V15h1.22V7.57z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}
