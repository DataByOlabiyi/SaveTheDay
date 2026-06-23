'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
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
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([])
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

    const ampersand = container.querySelector<HTMLSpanElement>('[data-ampersand]')

    if (ampersand) {
      ampersand.style.opacity = '0'
      ampersand.style.transform = 'scale(0.8)'
    }

    const stagger = NAME_STAGGER.delay

    const tl = gsap.timeline({ delay: delay / 1000 })
    spanRefs.current.forEach((el, i) => {
      if (!el) return
      tl.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, i * (stagger / 1000))
    })

    // Animate ampersand with special scale effect
    const name1Chars = name1.length
    const ampStart = delay + name1Chars * stagger + 200
    const ampTimeouts: ReturnType<typeof setTimeout>[] = []
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
      ampTimeouts.push(t)
    }

    // All chars done
    const totalDuration = delay + (spanRefs.current.length + 5) * stagger + 400
    const completionTimeout = setTimeout(() => {
      onCompleteRef.current?.()
    }, totalDuration)
    ampTimeouts.push(completionTimeout)

    return () => {
      tl.kill()
      ampTimeouts.forEach(t => clearTimeout(t))
    }
  }, [name1, name2, autoPlay, delay])

  const renderName = (name: string, prefix: string, offset: number) =>
    name.split('').map((char, i) => (
      <span
        key={`${prefix}-${i}`}
        ref={el => { spanRefs.current[offset + i] = el }}
        className="text-gold-gradient"
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
        className="font-display tracking-widest"
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          lineHeight: 1.05,
          fontWeight: 300,
          letterSpacing: '0.08em',
        }}
      >
        {renderName(name1, 'n1', 0)}
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
        className="font-display tracking-widest"
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 5rem)',
          lineHeight: 1.05,
          fontWeight: 300,
          letterSpacing: '0.08em',
        }}
      >
        {renderName(name2, 'n2', name1.length)}
      </div>
    </div>
  )
}
