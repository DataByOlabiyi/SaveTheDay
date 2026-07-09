'use client'

import { useState, useRef, useCallback, useEffect, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ParticleField } from '@/components/atoms/ParticleField'
import { FlameIcon } from '@/components/atoms/FlameIcon'
import { vibrate, HAPTIC } from '@/lib/animations/timelines'

// Static paper-grain textures, encoded once at module scope — never regenerated
// per render. Must stay static (no <animate>): unlike FlameIcon's turbulence,
// which unmounts after ~1.8s, this grain persists through the whole indefinite
// envelope-float dwell, so an animated filter here would be an unbounded cost.
const GRAIN_DARK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='7' stitchTiles='stitch'/>
    <feColorMatrix type='matrix' values='0 0 0 0 0.05  0 0 0 0 0.15  0 0 0 0 0.09  0 0 0 0.35 0'/></filter>
    <rect width='120' height='120' filter='url(#n)'/>
  </svg>`
)}")`

const GRAIN_CREAM = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' seed='11' stitchTiles='stitch'/>
    <feColorMatrix type='matrix' values='0 0 0 0 0.55  0 0 0 0 0.42  0 0 0 0 0.2  0 0 0 0.18 0'/></filter>
    <rect width='140' height='140' filter='url(#n)'/>
  </svg>`
)}")`

// Hand-authored deckled-edge silhouette — fixed points, not randomized, so the
// shape is identical on every render and can't cause an SSR/client hydration
// mismatch. Applied only to a static, non-rotating wrapper (see EnvelopeBody)
// to avoid the clip-path + 3D-transform seam bug fixed earlier in this file.
const DECKLE_CLIP = 'polygon(1% 1%, 50% 0.5%, 99% 1.2%, 99.3% 14%, 99.6% 50%, 98.9% 86%, 86% 99.2%, 50% 99.4%, 1% 98.8%, 0.8% 86%, 0.6% 50%, 0.7% 14%)'

// Builds a smooth irregular "wax drip" blob from a ring of radii, using the
// midpoint-quadratic technique (each vertex is a curve control point, each
// midpoint an anchor) so the outline reads as an organic drip rather than a
// faceted polygon.
function buildBlobPath(radii: number[], cx: number, cy: number): string {
  const pts = radii.map((r, i) => {
    const a = (i * (360 / radii.length) * Math.PI) / 180
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
  })
  const mid = (a: readonly [number, number], b: readonly [number, number]) =>
    [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const
  const start = mid(pts[pts.length - 1], pts[0])
  let d = `M ${start[0].toFixed(2)} ${start[1].toFixed(2)} `
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length]
    const m = mid(pts[i], next)
    d += `Q ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)} ${m[0].toFixed(2)} ${m[1].toFixed(2)} `
  }
  return d + 'Z'
}

const WAX_DRIP_PATH = buildBlobPath([31, 37, 33, 39, 30, 36, 32, 38, 31, 35, 37, 33], 46, 46)

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
        background: 'radial-gradient(ellipse at 50% 48%, rgba(18,28,14,0.95) 0%, rgba(2,7,4,1) 65%)',
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
      {/* Ambient glow beneath envelope — emerald primary + a wider, dimmer gold
          undertone so the light reads warmer, more like candlelight on paper */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: -30, left: '5%', right: '5%', height: 50,
          background: 'radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 65%)',
          filter: 'blur(14px)',
        }}
        animate={isFloating ? { opacity: [0.5, 0.85, 0.5] } : { opacity: 0.4 }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      />
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
        {/* Deckled paper-edge silhouette — static, non-rotating, non-perspective
            wrapper. Clips the whole assembly (not just individual panels) so the
            envelope's true outer edge reads as organic/torn rather than a clean
            rectangle. Kept as its own inert layer, separate from the perspective
            and rotation below, so it can never interact with the clip-path +
            3D-transform seam bug fixed earlier in this file. */}
        <div className="absolute inset-0" style={{ clipPath: DECKLE_CLIP }}>
          {/* perspective lives here, not on the outer wrapper, so it actually applies to the flap's rotateX below */}
          <div className="absolute inset-0" style={{ perspective: '700px' }}>

          {/* ── Envelope base (back face) ── */}
          <div
            className="absolute inset-0"
            style={{
              background: `${GRAIN_DARK}, linear-gradient(155deg, #122B1C 0%, #0A1D12 45%, #061008 100%)`,
              border: '1px solid rgba(12,168,110,0.28)',
              boxShadow: 'inset 0 1px 0 rgba(12,168,110,0.12), inset 0 -1px 0 rgba(0,0,0,0.4)',
            }}
          />

          {/* ── Cream liner — revealed as flap opens ── */}
          <motion.div
            className="absolute inset-x-2 top-2"
            style={{
              bottom: '30%',
              background: `${GRAIN_CREAM}, linear-gradient(170deg, #FAF4E8 0%, #F0E8D0 100%)`,
              boxShadow: '0 10px 24px rgba(20,10,5,0.35)',
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

          {/* ── Left panel — lighter (light source from left) ──
              No grain here: this panel (and its siblings below) sit under the
              flap and are recomposited on every frame of the float-bob and
              flap-rotation animations, so a textured background here is pure
              per-frame cost with the texture mostly hidden or edge-on anyway.
              Grain stays on the two large, always-flat surfaces (back face,
              liner) where it's visible and only ever painted once. */}
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

          {/* ── Postmark — small ink-stamp detail, always on the bottom triangle
              so it's never occluded by the flap in any phase ── */}
          <Postmark />

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
            {/* WebKit/Safari does not reliably compute backface-visibility for
                nested 3D children — verified live: even with the correct
                cross-browser sibling-face structure (plain rotating container,
                two backface-visibility:hidden siblings), WebKit still shows the
                rotated-away face at rest. backface-visibility is kept below as a
                harmless hint for engines that do honor it, but the actual
                hide/show is driven explicitly by opacity tied to `isOpening`.
                That opacity is set via a *plain* CSS transition, not a nested
                Framer Motion value — on WebKit, a motion.div's `initial`/`animate`
                opacity silently failed to apply here (computed opacity stayed 1
                on both faces), most likely a timing quirk in how Framer Motion
                schedules its initial-style effect for motion components nested
                inside another motion.div's preserve-3d context. A plain style
                object updated on ordinary React re-render has no such dependency. */}
            <motion.div
              className="absolute"
              style={{
                left: '-15%', right: '-15%', top: 0, height: '160%',
                transformStyle: 'preserve-3d',
                transformOrigin: 'top center',
              }}
              animate={isOpening ? { rotateX: -115 } : {}}
              transition={{ duration: 0.95, delay: 0.1, ease: [0.455, 0.03, 0.515, 0.955] }}
            >
              {/* Flap outer — dark green, facing the viewer at rest.
                  No grain here: it's the one element actively 3D-rotated every
                  frame during the open sequence — the most expensive place to
                  force a textured-background recomposite, and the texture reads
                  as a blur mid-rotation anyway. */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden',
                  background: 'linear-gradient(155deg, #163322 0%, #0A1C12 60%, #050E08 100%)',
                  borderTop: '1px solid rgba(12,168,110,0.2)',
                  opacity: isOpening ? 0 : 1,
                  transition: `opacity 0.12s ease ${isOpening ? '0.68s' : '0s'}`,
                }}
              />
              {/* Flap inner — cream. Fades in ~0.68s into the 0.1s-delay/0.95s
                  rotation, roughly matching when the geometry crosses 90deg
                  (measured empirically), instead of "whenever rotated past 90deg"
                  per backface-visibility, which WebKit won't reliably honor. */}
              <div
                style={{
                  position: 'absolute', inset: 0,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateX(180deg)',
                  background: 'linear-gradient(160deg, #F5ECD8 0%, #E8D8B8 100%)',
                  opacity: isOpening ? 1 : 0,
                  transition: `opacity 0.12s ease ${isOpening ? '0.68s' : '0s'}`,
                }}
              />
            </motion.div>

            {/* Cast shadow — sweeps over the liner as the flap lifts, then settles */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(180deg, rgba(20,10,5,0.55) 0%, transparent 70%)' }}
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
      </div>
    </motion.div>
  )
}

// ── Postmark ──────────────────────────────────────────────────────────────────
// Small ink-stamp detail. Deliberately much smaller than the wax seal so it
// stays a secondary flourish, not a competing focal point.
function Postmark() {
  return (
    <svg
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{ left: '62%', top: '68%', width: 38, height: 38, transform: 'translate(-50%, -50%) rotate(-8deg)', zIndex: 2 }}
      viewBox="0 0 38 38" fill="none"
    >
      <circle cx="19" cy="19" r="15" stroke="#073628" strokeOpacity="0.55" strokeWidth="1"
        strokeDasharray="3 1.5 2 1 4 1.5 2.5 1" />
      {[-8, -2, 4, 10].map((dy, i) => (
        <path key={i}
          d={`M 2 ${19 + dy} Q 10 ${15 + dy} 19 ${19 + dy} T 36 ${19 + dy}`}
          stroke="#073628" strokeOpacity="0.45" strokeWidth="0.7" fill="none" />
      ))}
    </svg>
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
        style={{ filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.55)) drop-shadow(0 0 10px rgba(12,168,110,0.6))' }}
        className={`relative inline-flex items-center justify-center ${isOpening ? 'opacity-0 transition-opacity duration-300' : ''}`}
      >
        {/* Glow layer — warm gold core cooling to emerald at the rim, echoing the
            flame's own gradient so its warmth visually carries into the seal.
            Replaces the old animated drop-shadow filter (filter keyframes forced a repaint every frame) */}
        {isClickable && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full"
            style={{
              width: 120,
              height: 120,
              background: 'radial-gradient(circle, rgba(232,204,122,0.25) 0%, rgba(12,168,110,0.4) 45%, transparent 70%)',
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
              <stop offset="0%"   stopColor="#2E9670" stopOpacity="1"/>
              <stop offset="45%"  stopColor="#0B5240" stopOpacity="1"/>
              <stop offset="100%" stopColor="#052E22" stopOpacity="1"/>
            </radialGradient>
            <radialGradient id="sealSheen" cx="38%" cy="28%" r="55%">
              <stop offset="0%"   stopColor="#4DD9A0" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="#0CA86E"  stopOpacity="0"/>
            </radialGradient>
            {/* Static emboss — low-frequency turbulence read as a bump map via
                feDiffuseLighting, giving the wax an undulating "dripped" surface
                instead of a flat fill. No <animate>: this paints once and stays,
                unlike FlameIcon's turbulence which only runs during its ~1.8s phase. */}
            <filter id="waxEmboss" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.045 0.09" numOctaves="1" seed="4" result="noise"/>
              {/* Low-alpha warm tint, same recipe as the panel grain below — a full
                  feDiffuseLighting rig read as a solid yellow wash here, since its
                  output is opaque and dominated the emerald wax fill entirely.
                  Plain normal-alpha compositing (feMerge), not a named blend mode
                  (feBlend mode=overlay) — this SVG sits beside the seal's own
                  continuous glow-pulse/sonar-ring animations, so anything pricier
                  than default compositing here is paid on every one of their frames. */}
              <feColorMatrix in="noise" type="matrix"
                values="0 0 0 0 0.85  0 0 0 0 0.72  0 0 0 0 0.35  0 0 0 0.22 0" result="tint"/>
              <feComposite in="tint" in2="SourceGraphic" operator="in" result="clippedTint"/>
              <feMerge>
                <feMergeNode in="SourceGraphic"/>
                <feMergeNode in="clippedTint"/>
              </feMerge>
            </filter>
          </defs>

          {/* Outer sunburst lines — dialed back so it recedes into a background
              detail rather than being the seal's dominant (and rather flat) signature */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180
            return <line key={i}
              x1={46 + 40 * Math.cos(a)} y1={46 + 40 * Math.sin(a)}
              x2={46 + 34 * Math.cos(a)} y2={46 + 34 * Math.sin(a)}
              stroke="#0CA86E" strokeWidth="0.8" opacity="0.2"/>
          })}

          {/* Wax base — an irregular "drip" blob instead of a perfect circle,
              with a static emboss for a dripped-wax surface */}
          <path d={WAX_DRIP_PATH} fill="url(#sealFill)" filter="url(#waxEmboss)"/>
          <path d={WAX_DRIP_PATH} fill="url(#sealSheen)"/>

          {/* Outer rim — follows the same drip silhouette */}
          <path d={WAX_DRIP_PATH} fill="none" stroke="#0CA86E" strokeWidth="1.2" opacity="0.8"/>

          {/* Warm rim-light — thin arc along the upper-left, matching the scene's
              upper-left light source */}
          <path d={WAX_DRIP_PATH} fill="none" stroke="rgba(232,204,122,0.25)" strokeWidth="0.8"
            strokeLinecap="round" strokeDasharray="34 90" strokeDashoffset="10"/>

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

          {/* Surface sheen — broad ambient wash */}
          <ellipse cx="38" cy="34" rx="8" ry="5" fill="rgba(255,255,255,0.05)" transform="rotate(-30 38 34)"/>
          {/* Glassy hotspot — a sharper, brighter catch-light distinct from the ambient sheen */}
          <ellipse cx="36" cy="31" rx="5" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-30 36 31)"
            style={{ filter: 'blur(0.6px)' }}/>
        </svg>
      </motion.div>
    </button>
  )
})
