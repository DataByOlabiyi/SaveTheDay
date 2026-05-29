'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ParticleField } from '@/components/atoms/ParticleField'
import { FlameIcon } from '@/components/atoms/FlameIcon'
import { vibrate, HAPTIC } from '@/lib/animations/timelines'

interface EnvelopeSceneProps {
  onSealCracked: () => void
  visible: boolean
  /** Two-letter monogram shown on the wax seal, e.g. "MO" for Mojirade & Olabiyi */
  monogram?: string
}

type Phase = 'flame' | 'envelope-arrive' | 'envelope-float' | 'cracking' | 'opening' | 'opened'

export function EnvelopeScene({ onSealCracked, visible, monogram = 'S' }: EnvelopeSceneProps) {
  const [phase, setPhase] = useState<Phase>('flame')
  const [burstOrigin, setBurstOrigin] = useState<{ x: number; y: number } | null>(null)
  const [showParticleBurst, setShowParticleBurst] = useState(false)
  const sealRef = useRef<HTMLButtonElement>(null)

  // Advance through phases automatically
  useEffect(() => {
    if (!visible) return

    const timers: ReturnType<typeof setTimeout>[] = []

    // Flame appears (scene already entering)
    timers.push(setTimeout(() => setPhase('envelope-arrive'), 3000))
    timers.push(setTimeout(() => setPhase('envelope-float'), 4500))

    return () => timers.forEach(clearTimeout)
  }, [visible])

  const handleSealTap = useCallback(() => {
    if (phase !== 'envelope-float') return

    // Get position for particle burst
    if (sealRef.current) {
      const rect = sealRef.current.getBoundingClientRect()
      setBurstOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
    }

    setPhase('cracking')
    vibrate(HAPTIC.SEAL_CRACK)

    // Stagger the opening animation
    const t1 = setTimeout(() => setShowParticleBurst(true), 200)
    const t2 = setTimeout(() => setPhase('opening'), 600)
    const t3 = setTimeout(() => {
      setPhase('opened')
      onSealCracked()
    }, 2800)

    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [phase, onSealCracked])

  const isEnvelopeVisible = ['envelope-arrive', 'envelope-float', 'cracking', 'opening', 'opened'].includes(phase)

  return (
    <div className="relative w-full h-screen-safe flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient particle field */}
      <ParticleField className="absolute inset-0 w-full h-full" count={50} />

      {/* Particle burst on seal crack */}
      {showParticleBurst && burstOrigin && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <ParticleField
            className="w-full h-full"
            burst
            burstOrigin={burstOrigin}
            onBurstComplete={() => setShowParticleBurst(false)}
          />
        </div>
      )}

      {/* Flame — visible during flame phase */}
      <AnimatePresence>
        {phase === 'flame' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.4 } }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <FlameIcon size={72} />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.6, duration: 1 }}
              className="font-body text-xs tracking-widest uppercase text-ivory/50"
            >
              Something awaits
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Envelope */}
      <AnimatePresence>
        {isEnvelopeVisible && (
          <motion.div
            initial={{ y: '120vh', opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: {
                y: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.5 },
              },
            }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="relative flex flex-col items-center"
          >
            <EnvelopeBody
              phase={phase}
              sealRef={sealRef}
              onSealTap={handleSealTap}
              monogram={monogram}
            />

            {/* Tap prompt */}
            <AnimatePresence>
              {phase === 'envelope-float' && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-6 font-body text-xs tracking-[0.3em] uppercase text-ivory/40"
                  aria-hidden="true"
                >
                  Tap to open
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Envelope Body Component
// ──────────────────────────────────────────────────────────────

interface EnvelopeBodyProps {
  phase: Phase
  sealRef: React.RefObject<HTMLButtonElement>
  onSealTap: () => void
  monogram: string
}

function EnvelopeBody({ phase, sealRef, onSealTap, monogram }: EnvelopeBodyProps) {
  const isFloating = phase === 'envelope-float'
  const isOpening = ['opening', 'opened'].includes(phase)

  return (
    <motion.div
      // Subtle floating loop
      animate={isFloating ? {
        y: [0, -10, 0],
        rotate: [0, 0.5, 0, -0.5, 0],
      } : {}}
      transition={isFloating ? {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      } : {}}
      className="relative"
      style={{ width: 'min(320px, 85vw)' }}
    >
      {/* Envelope body */}
      <div
        className="relative"
        style={{
          paddingBottom: '70%', // 10:7 ratio
          perspective: '600px',
        }}
      >
        <div className="absolute inset-0">
          {/* Back of envelope */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              background: 'linear-gradient(145deg, #0D2419 0%, #081610 60%, #040E09 100%)',
              border: '1px solid rgba(12, 168, 110, 0.18)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(12, 168, 110, 0.08)',
            }}
          />

          {/* Envelope flap (top) */}
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 origin-top"
            animate={isOpening ? {
              rotateX: -110,
            } : {}}
            transition={{
              duration: 0.8,
              delay: 0.1,
              ease: [0.455, 0.03, 0.515, 0.955],
            }}
            style={{
              transformStyle: 'preserve-3d',
              background: 'linear-gradient(145deg, #0D2419 0%, #081610 100%)',
              transformOrigin: 'top center',
              zIndex: 2,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              borderTop: '1px solid rgba(12, 168, 110, 0.12)',
            }}
          />

          {/* Bottom triangles for envelope V shape */}
          <div
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{
              background: 'linear-gradient(180deg, #081610 0%, #040E09 100%)',
              clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
            }}
          />

          {/* Left triangle */}
          <div
            className="absolute inset-y-0 left-0 w-1/2"
            style={{
              background: 'linear-gradient(135deg, #0A1D13 0%, #081610 100%)',
              clipPath: 'polygon(0 0, 0 100%, 100% 50%)',
              opacity: 0.8,
            }}
          />

          {/* Right triangle */}
          <div
            className="absolute inset-y-0 right-0 w-1/2"
            style={{
              background: 'linear-gradient(225deg, #0A1D13 0%, #081610 100%)',
              clipPath: 'polygon(100% 0, 100% 100%, 0 50%)',
              opacity: 0.8,
            }}
          />

          {/* Emerald border accent */}
          <div
            className="absolute inset-0 rounded-sm pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(12, 168, 110, 0.14)',
            }}
          />

          {/* Wax Seal — the interactive element */}
          <WaxSeal
            ref={sealRef}
            phase={phase}
            onTap={onSealTap}
            monogram={monogram}
          />
        </div>
      </div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────────────────────
// Wax Seal Component
// ──────────────────────────────────────────────────────────────

import { forwardRef } from 'react'

const WaxSeal = forwardRef<HTMLButtonElement, {
  phase: Phase
  onTap: () => void
  monogram: string
}>(function WaxSeal({ phase, onTap, monogram }, ref) {
  const isClickable = phase === 'envelope-float'
  const isCracking = phase === 'cracking'
  const isOpening = ['opening', 'opened'].includes(phase)

  return (
    <button
      ref={ref}
      className={`wax-seal absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10
        ${isClickable ? 'cursor-pointer' : 'cursor-default pointer-events-none'}
      `}
      onClick={isClickable ? onTap : undefined}
      disabled={!isClickable}
      aria-label="Tap to open the envelope"
      tabIndex={isClickable ? 0 : -1}
    >
      <motion.div
        animate={isClickable ? {
          filter: [
            'drop-shadow(0 0 8px rgba(12, 168, 110, 0.5))',
            'drop-shadow(0 0 22px rgba(12, 168, 110, 0.9))',
            'drop-shadow(0 0 8px rgba(12, 168, 110, 0.5))',
          ],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
        className={`relative inline-flex items-center justify-center ${isOpening ? 'opacity-0 transition-opacity duration-300' : ''}`}
      >
        {/* Sonar ping rings — shown only when tappable */}
        {isClickable && (
          <>
            <motion.span
              className="absolute rounded-full pointer-events-none"
              style={{ width: 96, height: 96, border: '1px solid rgba(12,168,110,0.5)' }}
              animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0 }}
            />
            <motion.span
              className="absolute rounded-full pointer-events-none"
              style={{ width: 96, height: 96, border: '1px solid rgba(12,168,110,0.3)' }}
              animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
            />
          </>
        )}

        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          {/* Seal base — deep forest green */}
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="#0B5240"
            stroke="#0CA86E"
            strokeWidth="1.5"
          />

          {/* Seal inner fill — subtle gradient feel */}
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="url(#sealGradient)"
            opacity="0.6"
          />
          <defs>
            <radialGradient id="sealGradient" cx="40%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#1A7A5A" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#073628" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Seal decorative ring */}
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="#0CA86E"
            strokeWidth="0.5"
            opacity="0.6"
          />

          {/* Crack paths — drawn on interaction */}
          {isCracking && (
            <>
              <motion.path
                d="M40 15 L44 28 L36 32 L42 45"
                stroke="#3DD9A0"
                strokeWidth="1"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.path
                d="M40 15 L35 26 L43 30 L37 44"
                stroke="#C0EDD9"
                strokeWidth="0.5"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.7 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              />
              <motion.path
                d="M28 38 L36 32 L44 28 L52 38"
                stroke="#3DD9A0"
                strokeWidth="1"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.1 }}
              />
            </>
          )}

          {/* Couple monogram — first initials of each name */}
          <text
            x="40"
            y="46"
            textAnchor="middle"
            fill="#3DD9A0"
            fontFamily="Georgia, serif"
            fontSize={monogram.length > 1 ? '16' : '22'}
            fontWeight="300"
            fontStyle="italic"
            letterSpacing="3"
          >
            {monogram}
          </text>

          {/* Decorative dots around seal */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180
            const r = 33
            return (
              <circle
                key={i}
                cx={40 + r * Math.cos(angle)}
                cy={40 + r * Math.sin(angle)}
                r="1"
                fill="#0CA86E"
                opacity="0.6"
              />
            )
          })}
        </svg>
      </motion.div>
    </button>
  )
})
