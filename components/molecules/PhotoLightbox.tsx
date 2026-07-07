'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  motion, AnimatePresence, animate,
  useMotionValue, useTransform, useMotionValueEvent,
  type PanInfo,
} from 'framer-motion'
import Image from 'next/image'
import type { GalleryPhoto } from '@/lib/db/types'
import { usePinchZoom } from '@/lib/hooks/usePinchZoom'
import { usePrefersReducedMotion, motionTransition } from '@/lib/utils/motion'
import { shouldPreloadImages, type NetworkConnectionInfo } from '@/lib/utils/connection'

interface PhotoLightboxProps {
  photos:        GalleryPhoto[]
  currentIndex:  number
  onClose:       () => void
  onNext:        () => void
  onPrev:        () => void
  goToIndex?:    (i: number) => void
  onDownload?:   (photo: GalleryPhoto) => void
  allowDownload?: boolean
}

const EASE: number[] = [0.22, 1, 0.36, 1]
const BEZIER = [0.22, 1, 0.36, 1] as const
const SWIPE_DISTANCE_THRESHOLD = 100
const SWIPE_VELOCITY_THRESHOLD = 500
const SWIPE_COMMIT_DURATION    = 0.2
const SNAP_BACK_SPRING         = { type: 'spring' as const, stiffness: 400, damping: 40 }
const NAV_CROSSFADE_MS         = 280
const PRELOAD_DELAY_MS         = 300

export function PhotoLightbox({
  photos, currentIndex, onClose, onNext, onPrev, goToIndex,
  onDownload, allowDownload = false,
}: PhotoLightboxProps) {
  const photo          = photos[currentIndex]
  const hasPrev        = currentIndex > 0
  const hasNext        = currentIndex < photos.length - 1
  const thumbRef       = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const imageRef       = useRef<HTMLDivElement>(null)
  const stageRef       = useRef<HTMLDivElement>(null)

  const reducedMotion = usePrefersReducedMotion()

  // Portal target is resolved on mount only (client-only DOM lookup)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  useEffect(() => { setPortalTarget(document.getElementById('lightbox-root')) }, [])

  const [loadedIds, setLoadedIds]             = useState<Set<string>>(new Set())
  const [chromeVisible, setChromeVisible]     = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [stageWidth, setStageWidth]           = useState(0)
  const [showPreload, setShowPreload]         = useState(false)

  // Suppresses the button/keyboard crossfade for the one render caused by a
  // committed swipe — the drag-slide layer already provided that transition.
  const suppressNextCrossfadeRef = useRef(false)

  const dragX = useMotionValue(0)
  const prevX = useTransform(dragX, v => v - stageWidth)
  const nextX = useTransform(dragX, v => v + stageWidth)

  const { scale, x: zoomX, y: zoomY, isZoomed, isGesturing, bind: pinchBind, reset: resetZoom } =
    usePinchZoom({ imageRef, disabled: isTransitioning, reducedMotion })

  // Measure the swipe stage so the adjacent-panel offset (±100%) tracks real px
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => setStageWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Zoom/pan/drag reset must be instant (no spring) so it never fights the
  // incoming photo's own entrance transition.
  useEffect(() => {
    resetZoom()
    dragX.set(0)
    setChromeVisible(true)
  }, [currentIndex, resetZoom, dragX])

  useEffect(() => { suppressNextCrossfadeRef.current = false }, [currentIndex])
  const suppressCrossfade = suppressNextCrossfadeRef.current

  useMotionValueEvent(scale, 'change', latest => {
    if (latest > 1.05) setChromeVisible(false)
    else if (latest <= 1.001) setChromeVisible(true)
  })

  const handleImageTap = useCallback(() => setChromeVisible(v => !v), [])

  const navigate = useCallback((action: () => void) => {
    setIsTransitioning(true)
    action()
    window.setTimeout(() => setIsTransitioning(false), reducedMotion ? 0 : NAV_CROSSFADE_MS)
  }, [reducedMotion])

  const goNext  = useCallback(() => { if (!isTransitioning && hasNext) navigate(onNext) }, [isTransitioning, hasNext, navigate, onNext])
  const goPrev  = useCallback(() => { if (!isTransitioning && hasPrev) navigate(onPrev) }, [isTransitioning, hasPrev, navigate, onPrev])
  const goToIdx = useCallback((i: number) => {
    if (isTransitioning) return
    if (goToIndex) navigate(() => goToIndex(i))
    else navigate(i < currentIndex ? onPrev : onNext)
  }, [isTransitioning, goToIndex, navigate, currentIndex, onPrev, onNext])

  const springBack = useCallback(() => {
    animate(dragX, 0, reducedMotion ? { duration: 0 } : SNAP_BACK_SPRING)
  }, [dragX, reducedMotion])

  const commitSwipe = useCallback((direction: 'prev' | 'next') => {
    if (isTransitioning) return
    setIsTransitioning(true)
    const target = direction === 'next' ? -stageWidth : stageWidth
    const controls = animate(dragX, target, reducedMotion ? { duration: 0 } : { duration: SWIPE_COMMIT_DURATION, ease: BEZIER })
    controls.then(() => {
      suppressNextCrossfadeRef.current = true
      if (direction === 'next') onNext(); else onPrev()
      dragX.set(0)
      setIsTransitioning(false)
    })
  }, [isTransitioning, stageWidth, reducedMotion, dragX, onNext, onPrev])

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isZoomed || photos.length <= 1 || isTransitioning) { springBack(); return }
    const passedDistance = Math.abs(info.offset.x) >= SWIPE_DISTANCE_THRESHOLD
    const passedVelocity = Math.abs(info.velocity.x) >= SWIPE_VELOCITY_THRESHOLD
    if (passedDistance || passedVelocity) {
      if (info.offset.x < 0 && hasNext) { commitSwipe('next'); return }
      if (info.offset.x > 0 && hasPrev) { commitSwipe('prev'); return }
    }
    springBack()
  }, [isZoomed, photos.length, isTransitioning, hasNext, hasPrev, commitSwipe, springBack])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape')     onClose()
    if (e.key === 'ArrowRight') goNext()
    if (e.key === 'ArrowLeft')  goPrev()
  }, [onClose, goNext, goPrev])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  // Scroll active thumbnail into view whenever currentIndex changes
  useEffect(() => {
    if (!thumbRef.current) return
    const active = thumbRef.current.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [currentIndex])

  // Adjacent-photo preload — warms the Next.js image-optimizer cache before the
  // guest navigates. Delayed so it never competes with the current photo's own
  // request, and skipped on constrained connections.
  useEffect(() => {
    setShowPreload(false)
    if (!photo || !loadedIds.has(photo.id)) return
    const connection = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { connection?: NetworkConnectionInfo }).connection
      : undefined
    if (!shouldPreloadImages(connection)) return
    const t = window.setTimeout(() => setShowPreload(true), PRELOAD_DELAY_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, photo?.id, loadedIds])

  if (!photo || !portalTarget) return null

  const prevPhotoObj = hasPrev ? photos[currentIndex - 1] : null
  const nextPhotoObj = hasNext ? photos[currentIndex + 1] : null

  const cursorClass = isZoomed
    ? (isGesturing ? 'cursor-grabbing' : 'cursor-grab')
    : 'cursor-zoom-in'

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 h-screen-safe z-[300] bg-obsidian"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${currentIndex + 1} of ${photos.length}`}
    >
      {/* z-[1] — blurred full-bleed background, crossfades on committed navigation */}
      <div className="absolute inset-0 overflow-hidden z-[1]" aria-hidden>
        <AnimatePresence mode="sync">
          <motion.div
            key={photo.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionTransition(0.4, EASE, reducedMotion)}
            className="absolute inset-0"
          >
            <Image
              src={photo.thumbnail_url ?? photo.url}
              alt=""
              fill
              className="object-cover scale-110 blur-3xl opacity-50"
              sizes="100vw"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* z-[2] — scrim + vignette, keeps chrome legible over any background photo */}
      <div className="absolute inset-0 bg-obsidian/70 z-[2]" aria-hidden />
      <div
        className="absolute inset-0 z-[2] opacity-40 bg-[radial-gradient(circle_at_center,transparent_35%,theme(colors.obsidian)_100%)]"
        aria-hidden
      />

      {/* z-10 — all interactive content */}
      <div className="relative z-10 flex flex-col h-full" onFocusCapture={() => setChromeVisible(true)}>

        {/* ── Top bar ── */}
        <div
          className={`flex items-center justify-between px-4 py-3 flex-shrink-0 transition-opacity ${reducedMotion ? 'duration-0' : 'duration-200'} ${
            chromeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
          }`}
        >
          <p className="font-body text-ivory/40 text-xs tracking-widest tabular-nums">
            {currentIndex + 1} <span className="text-ivory/20">/ {photos.length}</span>
          </p>
          <div className="flex items-center gap-3">
            {allowDownload && onDownload && (
              <button
                onClick={() => onDownload(photo)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wider uppercase transition-colors border border-emerald-DEFAULT/30 text-emerald-DEFAULT/70 hover:text-emerald-DEFAULT hover:border-emerald-DEFAULT/60"
                aria-label="Download photo"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download
              </button>
            )}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-ivory/50 hover:text-ivory transition-colors"
              aria-label="Close lightbox"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Image area ── */}
        <div ref={stageRef} className="flex-1 relative flex items-center justify-center px-12 min-h-0">

          {/* Prev button — non-draggable sibling layer, never captured as a swipe */}
          <AnimatePresence>
            {hasPrev && (
              <motion.button
                key="prev"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                onClick={goPrev}
                className="hidden sm:flex absolute left-2 z-20 w-10 h-10 rounded-full items-center justify-center bg-black/50 border border-white/10 text-ivory/70 hover:text-ivory hover:border-white/30 hover:bg-black/70 transition-colors"
                aria-label="Previous photo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Draggable swipe stage — image content only, gated off while zoomed/transitioning/single-photo */}
          <motion.div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            drag={!isZoomed && photos.length > 1 && !isTransitioning ? 'x' : false}
            dragMomentum={false}
            style={{ x: dragX }}
            onDragEnd={handleDragEnd}
            onTap={handleImageTap}
          >
            {/* Adjacent photo, revealed proportionally as the current one is dragged past */}
            {prevPhotoObj && (
              <motion.div className="absolute inset-0 flex items-center justify-center" style={{ x: prevX }} aria-hidden>
                <Image
                  src={prevPhotoObj.thumbnail_url ?? prevPhotoObj.url}
                  alt=""
                  width={prevPhotoObj.width ?? 1200}
                  height={prevPhotoObj.height ?? 800}
                  className="object-contain w-full max-h-[72vh] max-w-4xl"
                  sizes="90vw"
                />
              </motion.div>
            )}
            {nextPhotoObj && (
              <motion.div className="absolute inset-0 flex items-center justify-center" style={{ x: nextX }} aria-hidden>
                <Image
                  src={nextPhotoObj.thumbnail_url ?? nextPhotoObj.url}
                  alt=""
                  width={nextPhotoObj.width ?? 1200}
                  height={nextPhotoObj.height ?? 800}
                  className="object-contain w-full max-h-[72vh] max-w-4xl"
                  sizes="90vw"
                />
              </motion.div>
            )}

            {/* Current photo — button/keyboard/thumbnail nav crossfades; swipe commits suppress it (handled visually by the drag-slide above) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={photo.id}
                initial={suppressCrossfade ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={suppressCrossfade ? { duration: 0 } : motionTransition(0.28, EASE, reducedMotion)}
                className="relative max-w-4xl w-full max-h-full"
              >
                <motion.div
                  ref={imageRef}
                  className={`relative w-full max-h-[72vh] ${cursorClass}`}
                  style={{ x: zoomX, y: zoomY, scale, touchAction: isGesturing ? 'none' : 'auto' }}
                  onPointerDown={pinchBind.onPointerDown}
                  onPointerMove={pinchBind.onPointerMove}
                  onPointerUp={pinchBind.onPointerUp}
                  onPointerCancel={pinchBind.onPointerCancel}
                  onDoubleClick={pinchBind.onDoubleClick}
                  onWheel={pinchBind.onWheel}
                >
                  {/*
                    Blurred base stays mounted under the sharp image at all times — even
                    with the full-bleed scrim behind it, this is what fills the letterbox
                    the object-contain clamp leaves on extreme aspect ratios.
                  */}
                  <div className="absolute inset-0 overflow-hidden" aria-hidden>
                    <Image
                      src={photo.thumbnail_url ?? photo.url}
                      alt=""
                      fill
                      className="object-cover scale-110 blur-3xl opacity-50"
                      sizes="90vw"
                    />
                  </div>
                  <Image
                    src={photo.url}
                    alt={photo.caption ?? `Photo ${currentIndex + 1}`}
                    width={photo.width ?? 1200}
                    height={photo.height ?? 800}
                    className={`relative object-contain w-full max-h-[72vh] ${reducedMotion ? 'transition-none' : 'transition-opacity duration-300'} ${
                      loadedIds.has(photo.id) ? 'opacity-100' : 'opacity-0'
                    }`}
                    sizes="90vw"
                    priority
                    onLoad={() => setLoadedIds(prev => (
                      prev.has(photo.id) ? prev : new Set(prev).add(photo.id)
                    ))}
                  />
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Hidden preload instances — same width/height/sizes as the main image so
                Next's image optimizer resolves them to the same cache key it will
                actually request on navigation. */}
            {showPreload && prevPhotoObj && (
              <Image
                key={`preload-prev-${prevPhotoObj.id}`}
                src={prevPhotoObj.url}
                alt=""
                width={prevPhotoObj.width ?? 1200}
                height={prevPhotoObj.height ?? 800}
                sizes="90vw"
                className="absolute w-px h-px opacity-0 overflow-hidden pointer-events-none"
                aria-hidden
              />
            )}
            {showPreload && nextPhotoObj && (
              <Image
                key={`preload-next-${nextPhotoObj.id}`}
                src={nextPhotoObj.url}
                alt=""
                width={nextPhotoObj.width ?? 1200}
                height={nextPhotoObj.height ?? 800}
                sizes="90vw"
                className="absolute w-px h-px opacity-0 overflow-hidden pointer-events-none"
                aria-hidden
              />
            )}
          </motion.div>

          {/* Next button — non-draggable sibling layer, never captured as a swipe */}
          <AnimatePresence>
            {hasNext && (
              <motion.button
                key="next"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                onClick={goNext}
                className="hidden sm:flex absolute right-2 z-20 w-10 h-10 rounded-full items-center justify-center bg-black/50 border border-white/10 text-ivory/70 hover:text-ivory hover:border-white/30 hover:bg-black/70 transition-colors"
                aria-label="Next photo"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Caption ── */}
        <AnimatePresence mode="wait">
          {photo.caption && (
            <motion.div
              key={photo.id + '-caption'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={motionTransition(0.2, EASE, reducedMotion)}
              className={`px-4 py-2 text-center flex-shrink-0 transition-opacity ${reducedMotion ? 'duration-0' : 'duration-200'} ${
                chromeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
              }`}
            >
              <p className="font-display text-ivory/55 text-sm italic">{photo.caption}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Thumbnail strip — scrollable, clicking jumps directly ── */}
        {photos.length > 1 && (
          <div
            ref={thumbRef}
            className={`flex gap-1.5 overflow-x-auto px-4 pb-4 scrollbar-hide flex-shrink-0 transition-opacity ${reducedMotion ? 'duration-0' : 'duration-200'} ${
              chromeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
            }`}
            style={{ justifyContent: photos.length <= 8 ? 'center' : 'flex-start' }}
            role="tablist"
            aria-label="Photo thumbnails"
          >
            {photos.map((p, i) => (
              <button
                key={p.id}
                data-active={i === currentIndex ? 'true' : 'false'}
                role="tab"
                aria-selected={i === currentIndex}
                onClick={() => goToIdx(i)}
                className={[
                  'flex-shrink-0 w-12 h-12 rounded overflow-hidden',
                  'transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-DEFAULT',
                  i === currentIndex
                    ? 'opacity-100 ring-1 ring-emerald-DEFAULT scale-100'
                    : 'opacity-35 hover:opacity-65 scale-95 hover:scale-100',
                ].join(' ')}
                aria-label={`Go to photo ${i + 1}${p.caption ? `: ${p.caption}` : ''}`}
              >
                <Image
                  src={p.thumbnail_url ?? p.url}
                  alt=""
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>,
    portalTarget
  )
}
