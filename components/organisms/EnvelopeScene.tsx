'use client'

import { useState, useRef, useCallback, useEffect, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ParticleField } from '@/components/atoms/ParticleField'
import { FlameIcon } from '@/components/atoms/FlameIcon'
import { vibrate, HAPTIC } from '@/lib/animations/timelines'

interface EnvelopeSceneProps {
  onSealCracked: () => void
  visible: boolean
  monogram?: string
}

type Phase = 'flame' | 'envelope-arrive' | 'envelope-float' | 'cracking' | 'opening' | 'opened'

export function EnvelopeScene({ onSealCracked, visible, monogram = 'S' }: EnvelopeSceneProps) {
  const [phase, setPhase] = useState<Phase>('flame')
  const [burstOrigin, setBurstOrigin] = useState<{ x: number; y: number } | null>(null)
  const [showParticleBurst, setShowParticleBurst] = useState(false)
  const sealRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!visible) return
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setPhase('envelope-arrive'), 1800))
    timers.push(setTimeout(() => setPhase('envelope-float'), 3200))
    return () => timers.forEach(clearTimeout)
  }, [visible])

  const handleSealTap = useCallback(() => {
    if (phase !== 'envelope-float' && phase !== 'envelope-arrive') return
    if (sealRef.current) {
      const rect = sealRef.current.getBoundingClientRect()
      setBurstOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }
    setPhase('cracking')
    vibrate(HAPTIC.SEAL_CRACK)
    const t1 = setTimeout(() => setShowParticleBurst(true), 200)
    const t2 = setTimeout(() => setPhase('opening'), 600)
    const t3 = setTimeout(() => { setPhase('opened'); onSealCracked() }, 2800)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [phase, onSealCracked])

  const isEnvelopeVisible = ['envelope-arrive', 'envelope-float', 'cracking', 'opening', 'opened'].includes(phase)

  return (
    <div
      className="relative w-full h-screen-safe flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 48%, rgba(8,32,20,0.95) 0%, rgba(2,7,4,1) 65%)',
      }}
    >
      {/* Ambient particle field */}
      <ParticleField className="absolute inset-0 w-full h-full" count={50} />

      {/* Particle burst on seal crack */}
      {showParticleBurst && burstOrigin && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <ParticleField className="w-full h-full" burst burstOrigin={burstOrigin}
            onBurstComplete={() => setShowParticleBurst(false)} />
        </div>
      )}

      {/* ── Flame phase ── */}
      <AnimatePresence>
        {phase === 'flame' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.5 } }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-7"
          >
            {/* Warm bloom behind flame */}
            <div className="relative flex items-center justify-center">
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 180, height: 180,
                  background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, rgba(180,100,30,0.06) 45%, transparent 70%)',
                }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 100, height: 100,
                  background: 'radial-gradient(circle, rgba(232,204,122,0.1) 0%, transparent 70%)',
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              />
              <FlameIcon size={86} />
            </div>

            {/* Tagline — italic serif, gold-tinted */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-2"
            >
              <p
                className="font-display text-ivory/60"
                style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', fontWeight: 300, fontStyle: 'italic', letterSpacing: '0.04em' }}
              >
                Something awaits
              </p>
              <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent)' }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Envelope phase ── */}
      <AnimatePresence>
        {isEnvelopeVisible && (
          <motion.div
            initial={{ y: '120vh', opacity: 0 }}
            animate={{
              y: 0, opacity: 1,
              transition: {
                y: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.5 },
              },
            }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="relative flex flex-col items-center"
          >
            <EnvelopeBody phase={phase} sealRef={sealRef} onSealTap={handleSealTap} monogram={monogram} />

            {/* Tap prompt */}
            <AnimatePresence>
              {phase === 'envelope-float' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="mt-8 flex flex-col items-center gap-2"
                  aria-hidden="true"
                >
                  <p className="font-body text-xs tracking-[0.35em] uppercase text-ivory/35">
                    Tap to open
                  </p>
                  {/* Animated chevron */}
                  <motion.svg
                    width="12" height="8" viewBox="0 0 12 8" fill="none"
                    animate={{ y: [0, 3, 0], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <path d="M1 1L6 6L11 1" stroke="rgba(12,168,110,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </motion.svg>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Envelope Body ─────────────────────────────────────────────────────────────

interface EnvelopeBodyProps {
  phase: Phase
  sealRef: React.RefObject<HTMLButtonElement>
  onSealTap: () => void
  monogram: string
}

function EnvelopeBody({ phase, sealRef, onSealTap, monogram }: EnvelopeBodyProps) {
  const isFloating = phase === 'envelope-float'
  const isOpening  = ['opening', 'opened'].includes(phase)

  return (
    <motion.div
      animate={isFloating ? { y: [0, -10, 0], rotate: [0, 0.4, 0, -0.4, 0] } : {}}
      transition={isFloating ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : {}}
      className="relative"
      style={{ width: 'min(300px, 82vw)' }}
    >
      {/* Ambient glow beneath envelope */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: -24, left: '10%', right: '10%', height: 40,
          background: 'radial-gradient(ellipse, rgba(12,168,110,0.18) 0%, transparent 70%)',
          filter: 'blur(10px)',
        }}
        animate={isFloating ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.5 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div
        className="relative"
        style={{
          paddingBottom: '70%',
          filter: 'drop-shadow(0 28px 40px rgba(0,0,0,0.85)) drop-shadow(0 8px 16px rgba(0,0,0,0.6))',
        }}
      >
        {/* perspective lives here, not on the outer wrapper, so it actually applies to the flap's rotateX below */}
        <div className="absolute inset-0" style={{ perspective: '700px' }}>

          {/* ── Envelope base (back face) ── */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(155deg, #122B1C 0%, #0A1D12 45%, #061008 100%)',
              border: '1px solid rgba(12,168,110,0.28)',
              boxShadow: 'inset 0 1px 0 rgba(12,168,110,0.12), inset 0 -1px 0 rgba(0,0,0,0.4)',
            }}
          />

          {/* ── Cream liner — revealed as flap opens ── */}
          <motion.div
            className="absolute inset-x-2 top-2"
            style={{
              bottom: '30%',
              background: 'linear-gradient(170deg, #FAF4E8 0%, #F0E8D0 100%)',
              boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
              zIndex: 1,
            }}
            initial={{ y: 6, scale: 0.97, opacity: 0 }}
            animate={isOpening ? { y: -20, scale: 1, opacity: 1 } : { y: 6, scale: 0.97, opacity: 0 }}
            transition={{ duration: 1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{ position: 'absolute', inset: 6, border: '0.5px solid rgba(160,110,60,0.2)' }} />
            <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.16 }}
              width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="7" fill="rgba(140,90,40,0.6)"/>
              {[0,60,120,180,240,300].map((deg, i) => (
                <ellipse key={i}
                  cx={18 + 11 * Math.cos(deg * Math.PI / 180)}
                  cy={18 + 11 * Math.sin(deg * Math.PI / 180)}
                  rx="4" ry="3" fill="rgba(140,90,40,0.5)"
                  transform={`rotate(${deg} ${18 + 11 * Math.cos(deg * Math.PI / 180)} ${18 + 11 * Math.sin(deg * Math.PI / 180)})`}
                />
              ))}
            </svg>
          </motion.div>

          {/* ── Left panel — lighter (light source from left) ── */}
          <div
            className="absolute inset-y-0 left-0 w-1/2"
            style={{
              background: 'linear-gradient(135deg, rgba(22,58,38,0.95) 0%, rgba(10,28,18,0.85) 100%)',
              clipPath: 'polygon(0 0, 0 100%, 100% 50%)',
            }}
          />

          {/* ── Right panel — darker (shadow side) ── */}
          <div
            className="absolute inset-y-0 right-0 w-1/2"
            style={{
              background: 'linear-gradient(225deg, rgba(8,20,13,0.98) 0%, rgba(4,10,7,0.95) 100%)',
              clipPath: 'polygon(100% 0, 100% 100%, 0 50%)',
            }}
          />

          {/* ── Bottom triangle ── */}
          <div
            className="absolute inset-x-0 bottom-0 h-1/2"
            style={{
              background: 'linear-gradient(180deg, rgba(10,20,14,0.9) 0%, rgba(3,7,5,1) 100%)',
              clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
            }}
          />

          {/* ── Fold crease line — horizontal seam between flap and body ── */}
          <div
            className="absolute inset-x-0 pointer-events-none"
            style={{
              top: '50%',
              height: 1,
              background: 'linear-gradient(to right, transparent 0%, rgba(12,168,110,0.35) 15%, rgba(20,200,130,0.5) 50%, rgba(12,168,110,0.35) 85%, transparent 100%)',
              zIndex: 4,
            }}
          />

          {/* ── Flap (top triangle, folds back on open) ──
              The clip-path lives on this static, non-rotating mask — clip-path
              combined directly with a 3D-rotated element renders with jagged,
              unclipped seams in Chromium/WebKit. The actual rotating plane sits
              inside, oversized, so the crisp triangle window never reveals its edges. */}
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 overflow-hidden pointer-events-none"
            style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)', zIndex: 3 }}
            animate={{ opacity: phase === 'opened' ? 0 : 1 }}
            transition={{ duration: 0.4, delay: phase === 'opened' ? 0.5 : 0 }}
          >
            <motion.div
              className="absolute"
              style={{
                left: '-15%', right: '-15%', top: 0, height: '160%',
                transformStyle: 'preserve-3d',
                transformOrigin: 'top center',
                backfaceVisibility: 'hidden',
                background: 'linear-gradient(155deg, #163322 0%, #0A1C12 60%, #050E08 100%)',
                borderTop: '1px solid rgba(12,168,110,0.2)',
              }}
              animate={isOpening ? { rotateX: -115 } : {}}
              transition={{ duration: 0.95, delay: 0.1, ease: [0.455, 0.03, 0.515, 0.955] }}
            >
              {/* Flap inner — cream, only visible once rotated past 90deg */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(160deg, #F5ECD8 0%, #E8D8B8 100%)',
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
              }} />
            </motion.div>

            {/* Cast shadow — sweeps over the liner as the flap lifts, then settles */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 70%)' }}
              initial={{ opacity: 0 }}
              animate={isOpening ? { opacity: [0, 0.6, 0.12] } : { opacity: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
            />
          </motion.div>

          {/* ── Emerald inner border glow ── */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(12,168,110,0.18), inset 0 0 24px rgba(0,0,0,0.25)' }}
          />

          {/* ── Wax Seal ── */}
          <WaxSeal ref={sealRef} phase={phase} onTap={onSealTap} monogram={monogram} />
        </div>
      </div>
    </motion.div>
  )
}

// ── Wax Seal ──────────────────────────────────────────────────────────────────

const WaxSeal = forwardRef<HTMLButtonElement, {
  phase: Phase
  onTap: () => void
  monogram: string
}>(function WaxSeal({ phase, onTap, monogram }, ref) {
  const isClickable = phase === 'envelope-float' || phase === 'envelope-arrive'
  const isCracking  = phase === 'cracking'
  const isOpening   = ['opening', 'opened'].includes(phase)

  return (
    <button
      ref={ref}
      className={`wax-seal absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10
        ${isClickable ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
      onClick={isClickable ? onTap : undefined}
      disabled={!isClickable}
      aria-label="Tap to open the envelope"
      tabIndex={isClickable ? 0 : -1}
    >
      <motion.div
        style={{ filter: 'drop-shadow(0 0 10px rgba(12,168,110,0.6))' }}
        className={`relative inline-flex items-center justify-center ${isOpening ? 'opacity-0 transition-opacity duration-300' : ''}`}
      >
        {/* Glow layer — replaces the old animated drop-shadow filter (filter keyframes forced a repaint every frame) */}
        {isClickable && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full"
            style={{
              width: 120,
              height: 120,
              background: 'radial-gradient(circle, rgba(12,168,110,0.45) 0%, transparent 70%)',
            }}
            animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.9, 1.05, 0.9] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        )}

        {/* Sonar ping rings */}
        {isClickable && (
          <>
            <motion.span className="absolute rounded-full pointer-events-none"
              style={{ width: 112, height: 112, border: '1px solid rgba(12,168,110,0.5)' }}
              animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0 }}
            />
            <motion.span className="absolute rounded-full pointer-events-none"
              style={{ width: 112, height: 112, border: '1px solid rgba(12,168,110,0.3)' }}
              animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
            />
          </>
        )}

        <svg width="92" height="92" viewBox="0 0 92 92" fill="none">
          <defs>
            <radialGradient id="sealFill" cx="38%" cy="32%" r="62%">
              <stop offset="0%"   stopColor="#1E7A58" stopOpacity="0.9"/>
              <stop offset="60%"  stopColor="#0B5240" stopOpacity="1"/>
              <stop offset="100%" stopColor="#052E22" stopOpacity="1"/>
            </radialGradient>
            <radialGradient id="sealSheen" cx="38%" cy="28%" r="55%">
              <stop offset="0%"   stopColor="#4DD9A0" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="#0CA86E"  stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* Outer sunburst lines */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i * 15 * Math.PI) / 180
            return <line key={i}
              x1={46 + 40 * Math.cos(a)} y1={46 + 40 * Math.sin(a)}
              x2={46 + 34 * Math.cos(a)} y2={46 + 34 * Math.sin(a)}
              stroke="#0CA86E" strokeWidth="0.8" opacity="0.45"/>
          })}

          {/* Scalloped outer edge */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i * 15 * Math.PI) / 180
            return <circle key={i}
              cx={46 + 38 * Math.cos(a)} cy={46 + 38 * Math.sin(a)}
              r="2.5" fill="#083D2C" stroke="#0CA86E" strokeWidth="0.6" opacity="0.7"/>
          })}

          {/* Wax base */}
          <circle cx="46" cy="46" r="32" fill="url(#sealFill)"/>
          <circle cx="46" cy="46" r="32" fill="url(#sealSheen)"/>

          {/* Outer ring */}
          <circle cx="46" cy="46" r="32" fill="none" stroke="#0CA86E" strokeWidth="1.2" opacity="0.8"/>

          {/* Rope-style dashed ring */}
          <circle cx="46" cy="46" r="26" fill="none" stroke="#0CA86E" strokeWidth="0.6"
            strokeDasharray="2.5 3" opacity="0.55"/>

          {/* Inner circle */}
          <circle cx="46" cy="46" r="22" fill="none" stroke="#0CA86E" strokeWidth="0.4" opacity="0.3"/>

          {/* Compass-point diamonds */}
          {[0, 90, 180, 270].map((deg, i) => {
            const r = deg * Math.PI / 180
            const cx2 = 46 + 26 * Math.cos(r), cy2 = 46 + 26 * Math.sin(r)
            return <path key={i}
              d={`M ${cx2} ${cy2 - 3} L ${cx2 + 2.5} ${cy2} L ${cx2} ${cy2 + 3} L ${cx2 - 2.5} ${cy2} Z`}
              fill="#0CA86E" opacity="0.7"/>
          })}

          {/* Crack paths */}
          {isCracking && (
            <>
              <motion.path d="M46 20 L49 31 L42 35 L47 48" stroke="#3DD9A0" strokeWidth="1.2" fill="none"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.28 }}/>
              <motion.path d="M46 20 L41 29 L50 33 L44 47" stroke="#C0EDD9" strokeWidth="0.6" fill="none"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.7 }}
                transition={{ duration: 0.28, delay: 0.05 }}/>
              <motion.path d="M30 44 L40 36 L52 32 L60 44" stroke="#3DD9A0" strokeWidth="1.2" fill="none"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.22, delay: 0.1 }}/>
              <motion.path d="M36 56 L42 46 L50 40 L58 52" stroke="#C0EDD9" strokeWidth="0.5" fill="none"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 0.22, delay: 0.14 }}/>
            </>
          )}

          {/* Monogram */}
          <text x="46" y="52" textAnchor="middle" fill="#4DD9A0"
            fontFamily="Georgia, serif"
            fontSize={monogram.length > 1 ? '17' : '24'}
            fontWeight="300" fontStyle="italic" letterSpacing="3" opacity="0.95">
            {monogram}
          </text>

          {/* Surface sheen */}
          <ellipse cx="38" cy="34" rx="8" ry="5" fill="rgba(255,255,255,0.05)" transform="rotate(-30 38 34)"/>
        </svg>
      </motion.div>
    </button>
  )
})
