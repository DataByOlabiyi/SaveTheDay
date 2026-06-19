'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { NAME_STAGGER } from '@/lib/animations/timelines'

interface NameRevealProps {
  name1: string
  name2: string
  className?: string
  onComplete?: () => void
  autoPlay?: boolean
  delay?: number // ms before starting
}

export function NameReveal({
  name1,
  name2,
  className,
  onComplete,
  autoPlay = true,
  delay = 0,
}: NameRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Stable ref so onComplete never needs to be in the effect dependency array.
  // Without this, an inline arrow function passed as onComplete creates a new
  // reference on every parent render, causing the effect to cancel and restart
  // the animation in a loop — leaving the names stuck at opacity: 0.
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete })

  useEffect(() => {
    if (!autoPlay) return

    const container = containerRef.current
    if (!container) return

    const chars = container.querySelectorAll<HTMLSpanElement>('[data-char]')
    const ampersand = container.querySelector<HTMLSpanElement>('[data-ampersand]')

    // Reset to initial state
    chars.forEach(char => {
      char.style.opacity = '0'
      char.style.transform = `translateY(${NAME_STAGGER.translateY}px)`
    })
    if (ampersand) {
      ampersand.style.opacity = '0'
      ampersand.style.transform = 'scale(0.8)'
    }

    const stagger = NAME_STAGGER.delay
    const dur = NAME_STAGGER.enterDuration

    const timeouts: ReturnType<typeof setTimeout>[] = []

    // Animate each character
    chars.forEach((char, i) => {
      const t = setTimeout(() => {
        char.style.transition = `opacity ${dur}ms var(--ease-expo-out), transform ${dur}ms var(--ease-expo-out)`
        char.style.opacity = '1'
        char.style.transform = 'translateY(0)'
      }, delay + i * stagger)
      timeouts.push(t)
    })

    // Animate ampersand with special scale effect
    const name1Chars = name1.length
    const ampStart = delay + name1Chars * stagger + 200
    if (ampersand) {
      const t = setTimeout(() => {
        ampersand.style.transition = `opacity 600ms var(--ease-dramatic), transform 600ms var(--ease-dramatic)`
        ampersand.style.opacity = '1'
        ampersand.style.transform = 'scale(1)'

        // Pulse effect
        setTimeout(() => {
          if (ampersand) {
            ampersand.style.transition = 'transform 300ms ease'
            ampersand.style.transform = 'scale(1.15)'
            setTimeout(() => {
              if (ampersand) {
                ampersand.style.transform = 'scale(1)'
              }
            }, 300)
          }
        }, 600)
      }, ampStart)
      timeouts.push(t)
    }

    // All chars done
    const totalDuration = delay + (chars.length + 5) * stagger + dur + 400
    const completionTimeout = setTimeout(() => {
      onCompleteRef.current?.()
    }, totalDuration)
    timeouts.push(completionTimeout)

    return () => timeouts.forEach(t => clearTimeout(t))
  }, [name1, name2, autoPlay, delay])

  const renderName = (name: string, prefix: string) =>
    name.split('').map((char, i) => (
      <span
        key={`${prefix}-${i}`}
        data-char
        style={{
          display: 'inline-block',
          opacity: 0,
          transform: `translateY(${NAME_STAGGER.translateY}px)`,
          // Preserve spaces
          whiteSpace: char === ' ' ? 'pre' : 'normal',
        }}
        aria-hidden="true"
      >
        {char}
      </span>
    ))

  return (
    <div
      ref={containerRef}
      className={cn('text-center select-none', className)}
      aria-label={`${name1} and ${name2}`}
    >
      {/* Name 1 */}
      <div
        className="font-display text-gold-gradient tracking-widest"
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          lineHeight: 1.05,
          fontWeight: 300,
          letterSpacing: '0.08em',
        }}
      >
        {renderName(name1, 'n1')}
      </div>

      {/* Ampersand */}
      <div
        className="py-2 md:py-4"
        style={{ lineHeight: 1 }}
      >
        <span
          data-ampersand
          className="font-display text-gold-shimmer"
          style={{
            fontSize: 'clamp(1.5rem, 5vw, 3rem)',
            fontStyle: 'italic',
            display: 'inline-block',
            opacity: 0,
            transform: 'scale(0.8)',
            // Run the shimmer 3 times then hold — prevents distracting infinite loop
            animationIterationCount: 3,
            animationFillMode: 'forwards',
          }}
          aria-hidden="true"
        >
          &amp;
        </span>
      </div>

      {/* Name 2 */}
      <div
        className="font-display text-gold-gradient tracking-widest"
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          lineHeight: 1.05,
          fontWeight: 300,
          letterSpacing: '0.08em',
        }}
      >
        {renderName(name2, 'n2')}
      </div>
    </div>
  )
}
