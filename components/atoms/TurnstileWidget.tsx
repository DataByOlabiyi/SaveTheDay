'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  className?: string
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: object) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

export function TurnstileWidget({ onVerify, onExpire, className = '' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef  = useRef<string | null>(null)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  function mount() {
    if (!containerRef.current || !window.turnstile || !siteKey) return
    // Avoid double-mounting
    if (widgetIdRef.current) return
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey:   siteKey,
      theme:     'dark',
      callback:  onVerify,
      'expired-callback': () => {
        onExpire?.()
      },
    })
  }

  useEffect(() => {
    // If Turnstile is already loaded (e.g., cached), mount immediately
    if (window.turnstile) mount()
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (!siteKey) return null

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onLoad={mount}
      />
      <div ref={containerRef} className={className} />
    </>
  )
}
