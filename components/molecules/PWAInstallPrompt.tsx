'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'android' | 'ios' | null

const DISMISSED_KEY = 'pwa-install-dismissed'

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  if (isStandalone) return null

  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return null // android is handled via beforeinstallprompt event
}

export function PWAInstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return

    const detected = detectPlatform()
    if (detected === 'ios') {
      const timer = setTimeout(() => {
        setPlatform('ios')
        setVisible(true)
      }, 3000)
      return () => clearTimeout(timer)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setPlatform('android')
      setTimeout(() => setVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', dismiss)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', dismiss)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    setDeferredPrompt(null)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-prompt"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="fixed bottom-6 left-4 right-4 z-[500] mx-auto max-w-sm"
          role="dialog"
          aria-label="Install Save The Day app"
        >
          <div className="relative rounded-2xl border border-gold/20 bg-[#0E1510] px-5 py-4 shadow-2xl backdrop-blur-md">
            {/* Dismiss */}
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-ivory/40 transition-colors hover:text-ivory/80"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <div className="flex items-start gap-3 pr-5">
              {/* App icon */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-DEFAULT/10 ring-1 ring-emerald-DEFAULT/30">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2L13.5 8H20L14.5 12L16.5 18.5L11 14.5L5.5 18.5L7.5 12L2 8H8.5L11 2Z" fill="#0CA86E" opacity="0.9" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold tracking-wide text-ivory">
                  Add to Home Screen
                </p>
                {platform === 'android' && (
                  <>
                    <p className="mt-0.5 text-xs text-ivory/50">
                      Install for the full experience — works offline too.
                    </p>
                    <button
                      onClick={handleInstall}
                      className="mt-3 rounded-full bg-emerald-DEFAULT px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-obsidian transition-opacity hover:opacity-90"
                    >
                      Install
                    </button>
                  </>
                )}
                {platform === 'ios' && (
                  <>
                    <p className="mt-0.5 text-xs text-ivory/50">
                      Tap the share button, then <span className="text-ivory/80 font-medium">Add to Home Screen</span>.
                    </p>
                    {/* iOS share icon hint */}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-ivory/40">
                      <span>Tap</span>
                      <span className="inline-flex items-center justify-center rounded border border-ivory/20 px-1 py-0.5">
                        <IOSShareIcon />
                      </span>
                      <span>in Safari</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function IOSShareIcon() {
  return (
    <svg width="13" height="16" viewBox="0 0 13 16" fill="none" aria-hidden>
      <path
        d="M6.5 1v9M3.5 4L6.5 1l3 3"
        stroke="#FAF7F2"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <path
        d="M1 7v7h11V7"
        stroke="#FAF7F2"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  )
}
