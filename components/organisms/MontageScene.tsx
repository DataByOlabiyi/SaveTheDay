'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { cloudinaryUrl } from '@/lib/utils'
import { Events } from '@/lib/analytics/events'

// Demo images — replaced with real Cloudinary assets per wedding
const DEMO_IMAGES = [
  { publicId: 'couple-1', caption: 'The beginning of everything' },
  { publicId: 'couple-2', caption: 'Every adventure, together' },
  { publicId: 'couple-3', caption: 'The moment we knew' },
  { publicId: 'couple-4', caption: 'Built for this' },
  { publicId: 'couple-5', caption: 'Now and always' },
]

interface MontageSceneProps {
  images?: { publicId: string; caption?: string }[]
  videoPublicId?: string
  weddingId?: string
  guestId?: string
  className?: string
}

export function MontageScene({
  images = DEMO_IMAGES,
  videoPublicId,
  weddingId,
  guestId,
  className = '',
}: MontageSceneProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused]         = useState(false)
  const [hasTracked, setHasTracked]     = useState(false)
  const [isHovered, setIsHovered]       = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const touchStartX = useRef<number>(0)
  const SLIDE_DURATION = 5000 // ms per slide

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, images.length - 1)))
    setIsPaused(true)
    setTimeout(() => setIsPaused(false), 2500)
  }, [images.length])

  const advance = useCallback(() => {
    setCurrentIndex(i => (i + 1) % images.length)
  }, [images.length])

  const prev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])
  const next = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])

  // Auto-advance slides
  useEffect(() => {
    if (isPaused) return
    intervalRef.current = setInterval(advance, SLIDE_DURATION)
    return () => clearInterval(intervalRef.current)
  }, [isPaused, advance])

  // Track video/montage watched event when > 50% complete
  useEffect(() => {
    if (!hasTracked && currentIndex >= Math.floor(images.length * 0.5)) {
      setHasTracked(true)
      if (weddingId) {
        Events.videoWatched(weddingId, guestId, 50)
      }
    }
  }, [currentIndex, images.length, hasTracked, weddingId, guestId])

  // Swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      dx < 0 ? next() : prev()
    }
  }

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next])

  const current = images[currentIndex]
  const isFirst = currentIndex === 0
  const isLast  = currentIndex === images.length - 1

  return (
    <section
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Wedding story montage"
    >
      {/* Slides */}
      <div className="relative overflow-hidden" style={{ height: '70vh', maxHeight: 600 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
              scale:   { duration: 6, ease: 'linear' }, // Ken Burns
            }}
            className="absolute inset-0"
          >
            {/* Fallback gradient */}
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at center, #2A1A0E 0%, #0A0A0B 100%)' }}
            />

            {/* Actual photo from Cloudinary */}
            {current.publicId && !current.publicId.startsWith('couple-') && (
              <Image
                src={cloudinaryUrl(current.publicId, { width: 800, height: 600, quality: 'auto', format: 'auto', crop: 'fill' })}
                alt={current.caption ?? 'Wedding photo'}
                fill
                className="object-cover"
                sizes="100vw"
                priority={currentIndex === 0}
              />
            )}

            {/* Caption overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-obsidian/20" />

            {current.caption && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="absolute bottom-8 left-0 right-0 px-8 text-center"
              >
                <p
                  className="font-display text-ivory/80"
                  style={{
                    fontSize:      'clamp(1rem, 3.5vw, 1.5rem)',
                    fontStyle:     'italic',
                    fontWeight:    300,
                    letterSpacing: '0.06em',
                  }}
                >
                  {current.caption}
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress indicators */}
        <div
          className="absolute top-4 left-4 right-4 flex gap-1.5 z-10"
          role="tablist"
          aria-label="Slide progress"
        >
          {images.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`Slide ${i + 1} of ${images.length}`}
              className="h-0.5 flex-1 cursor-pointer overflow-hidden bg-white/20"
              onClick={() => goTo(i)}
            >
              {i === currentIndex && (
                <motion.div
                  className="h-full bg-gold-DEFAULT"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isPaused ? undefined : 1 }}
                  transition={{ duration: SLIDE_DURATION / 1000, ease: 'linear' }}
                  style={{ transformOrigin: 'left' }}
                />
              )}
              {i < currentIndex && (
                <div className="h-full bg-gold-DEFAULT/70 w-full" />
              )}
            </button>
          ))}
        </div>

        {/* Slide counter — top right */}
        <div
          className="absolute top-4 right-4 z-20 font-body text-ivory/50 select-none"
          style={{ fontSize: '0.6rem', letterSpacing: '0.18em' }}
          aria-hidden="true"
        >
          {String(currentIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </div>

        {/* Desktop arrow navigation — appear on hover */}
        <AnimatePresence>
          {isHovered && !isFirst && (
            <motion.button
              key="prev-arrow"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background:     'rgba(8,12,10,0.7)',
                border:         '1px solid rgba(12,168,110,0.2)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(12,168,110,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </motion.button>
          )}

          {isHovered && !isLast && (
            <motion.button
              key="next-arrow"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center"
              style={{
                background:     'rgba(8,12,10,0.7)',
                border:         '1px solid rgba(12,168,110,0.2)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(12,168,110,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Pause indicator */}
        <AnimatePresence>
          {isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                <svg width="16" height="20" viewBox="0 0 16 20" fill="white">
                  <rect x="0" y="0" width="5" height="20" rx="2" />
                  <rect x="11" y="0" width="5" height="20" rx="2" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Swipe hint — mobile only */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        className="text-center mt-3 font-body text-xs tracking-widest uppercase text-ivory/40 md:hidden"
        aria-hidden="true"
      >
        Swipe to explore
      </motion.p>
    </section>
  )
}
