'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CountdownUnit } from '@/components/atoms/CountdownUnit'
import { getCountdown } from '@/lib/personalization/guest'

interface CountdownTimerProps {
  weddingDate: string
  className?: string
}

export function CountdownTimer({ weddingDate, className = '' }: CountdownTimerProps) {
  const [time, setTime] = useState(() => getCountdown(weddingDate))
  const prevRef = useRef(time)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => {
        prevRef.current = prev
        return getCountdown(weddingDate)
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [weddingDate])

  if (time.isPast) {
    return <WeddingDayHero />
  }

  return (
    <div
      className={`flex items-start justify-center gap-6 md:gap-10 ${className}`}
      aria-label={`Wedding countdown: ${time.days} days, ${time.hours} hours, ${time.minutes} minutes, ${time.seconds} seconds`}
    >
      <CountdownUnit value={time.days}    label="Days"    prevValue={prevRef.current.days}    />
      <div className="countdown-digit opacity-40 mt-1" aria-hidden="true">:</div>
      <CountdownUnit value={time.hours}   label="Hours"   prevValue={prevRef.current.hours}   />
      <div className="countdown-digit opacity-40 mt-1" aria-hidden="true">:</div>
      <CountdownUnit value={time.minutes} label="Minutes" prevValue={prevRef.current.minutes} />
      <div className="countdown-digit opacity-40 mt-1" aria-hidden="true">:</div>
      <CountdownUnit value={time.seconds} label="Seconds" prevValue={prevRef.current.seconds} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Wedding Day Hero — shown when the date has arrived
// ──────────────────────────────────────────────────────────────
function WeddingDayHero() {
  return (
    <div className="relative text-center py-4">
      {/* Radiating rings */}
      {[0, 0.4, 0.8].map((delay, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width:  160 + i * 60,
            height: 160 + i * 60,
            border: '1px solid rgba(12,168,110,0.3)',
          }}
          animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay, ease: 'easeOut' }}
        />
      ))}

      {/* Main headline */}
      <motion.p
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="font-display text-gold-gradient relative z-10"
        style={{
          fontSize:      'clamp(2rem, 7vw, 3.5rem)',
          fontWeight:    300,
          letterSpacing: '0.1em',
          lineHeight:    1.1,
        }}
      >
        Today is the day.
      </motion.p>

      {/* Sub-line */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="font-body text-ivory/40 mt-3 tracking-widest uppercase relative z-10"
        style={{ fontSize: '0.65rem', letterSpacing: '0.3em' }}
      >
        Celebrate in joy
      </motion.p>

      {/* Floating emoji confetti */}
      {['🥂', '💚', '✨', '🎊', '💍'].map((emoji, i) => (
        <motion.span
          key={i}
          className="absolute pointer-events-none select-none text-xl"
          style={{
            left:   `${15 + i * 17}%`,
            top:    '10%',
            filter: 'drop-shadow(0 0 6px rgba(12,168,110,0.4))',
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y:       [-10, -60, -10],
            opacity: [0, 0.9, 0],
            rotate:  [0, i % 2 === 0 ? 20 : -20, 0],
          }}
          transition={{
            duration:    3,
            repeat:      Infinity,
            delay:       i * 0.5,
            ease:        'easeInOut',
          }}
          aria-hidden="true"
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  )
}
