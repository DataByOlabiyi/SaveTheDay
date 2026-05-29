'use client'

import { useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { GalleryPhoto } from '@/lib/db/types'

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

export function PhotoLightbox({
  photos, currentIndex, onClose, onNext, onPrev, goToIndex,
  onDownload, allowDownload = false,
}: PhotoLightboxProps) {
  const photo    = photos[currentIndex]
  const hasPrev  = currentIndex > 0
  const hasNext  = currentIndex < photos.length - 1
  const thumbRef = useRef<HTMLDivElement>(null)

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape')                  onClose()
    if (e.key === 'ArrowRight' && hasNext)   onNext()
    if (e.key === 'ArrowLeft'  && hasPrev)   onPrev()
  }, [onClose, onNext, onPrev, hasPrev, hasNext])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [handleKey])

  // Scroll active thumbnail into view whenever currentIndex changes
  useEffect(() => {
    if (!thumbRef.current) return
    const active = thumbRef.current.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [currentIndex])

  if (!photo) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[300] bg-black/96 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${currentIndex + 1} of ${photos.length}`}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
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
      <div className="flex-1 relative flex items-center justify-center px-12 min-h-0">

        {/* Prev button */}
        <AnimatePresence>
          {hasPrev && (
            <motion.button
              key="prev"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onClick={onPrev}
              className="absolute left-2 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/50 border border-white/10 text-ivory/70 hover:text-ivory hover:border-white/30 hover:bg-black/70 transition-colors"
              aria-label="Previous photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Photo */}
        <AnimatePresence mode="wait">
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-4xl w-full max-h-full"
          >
            <Image
              src={photo.url}
              alt={photo.caption ?? `Photo ${currentIndex + 1}`}
              width={photo.width ?? 1200}
              height={photo.height ?? 800}
              className="object-contain w-full max-h-[72vh]"
              sizes="90vw"
              priority
            />
          </motion.div>
        </AnimatePresence>

        {/* Next button */}
        <AnimatePresence>
          {hasNext && (
            <motion.button
              key="next"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              onClick={onNext}
              className="absolute right-2 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-black/50 border border-white/10 text-ivory/70 hover:text-ivory hover:border-white/30 hover:bg-black/70 transition-colors"
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
            transition={{ duration: 0.2 }}
            className="px-4 py-2 text-center flex-shrink-0"
          >
            <p className="font-display text-ivory/55 text-sm italic">{photo.caption}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Thumbnail strip — scrollable, clicking jumps directly ── */}
      {photos.length > 1 && (
        <div
          ref={thumbRef}
          className="flex gap-1.5 overflow-x-auto px-4 pb-4 scrollbar-hide flex-shrink-0"
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
              onClick={() => goToIndex ? goToIndex(i) : (i < currentIndex ? onPrev() : onNext())}
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
    </motion.div>
  )
}
