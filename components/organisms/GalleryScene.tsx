'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { GoldDivider } from '@/components/atoms/GoldText'
import { PhotoLightbox } from '@/components/molecules/PhotoLightbox'
import { Events } from '@/lib/analytics/events'
import type { GalleryAlbum, GalleryPhoto } from '@/lib/db/types'

const INITIAL_COUNT = 12   // photos shown in the invitation preview

interface GallerySceneProps {
  weddingId:       string
  guestId?:        string
  allowDownloads?: boolean
  initialAlbums?:  GalleryAlbum[]
  initialPhotos?:  GalleryPhoto[]
  /** Full gallery page URL — e.g. /moji-olabiyi/gallery */
  galleryHref?:    string
}

export function GalleryScene({
  weddingId, guestId,
  allowDownloads = false,
  initialAlbums, initialPhotos,
  galleryHref,
}: GallerySceneProps) {
  const [albums, setAlbums]             = useState<GalleryAlbum[]>(initialAlbums ?? [])
  const [photos, setPhotos]             = useState<GalleryPhoto[]>(initialPhotos ?? [])
  const [activeAlbum, setActiveAlbum]   = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx]   = useState<number | null>(null)
  const [loading, setLoading]           = useState(!initialAlbums)
  const [tracked, setTracked]           = useState(false)
  const [showAll, setShowAll]           = useState(false)
  const [downloading, setDownloading]   = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Load data if not SSR pre-fetched
  useEffect(() => {
    if (initialAlbums && initialPhotos) return
    setLoading(true)
    fetch(`/api/gallery?weddingId=${weddingId}`)
      .then(r => r.json())
      .then(data => {
        setAlbums(data.albums ?? [])
        setPhotos(data.photos ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [weddingId, initialAlbums, initialPhotos])

  // Track gallery view once
  const handleSectionVisible = useCallback(() => {
    if (tracked) return
    setTracked(true)
    Events.galleryViewed(weddingId, guestId)
  }, [tracked, weddingId, guestId])

  // Filtered photos for current album
  const visiblePhotos = activeAlbum
    ? photos.filter(p => p.album_id === activeAlbum)
    : photos

  // Photos actually shown in the grid
  const displayedPhotos = showAll ? visiblePhotos : visiblePhotos.slice(0, INITIAL_COUNT)
  const hiddenCount     = visiblePhotos.length - INITIAL_COUNT

  const handleAlbumChange = (albumId: string | null) => {
    setActiveAlbum(albumId)
    setShowAll(false)   // collapse back when switching albums
  }

  // Lightbox navigation — operates on visiblePhotos so all photos are reachable
  const openLightbox  = (idx: number) => setLightboxIdx(idx)
  const closeLightbox = () => setLightboxIdx(null)
  const nextPhoto     = () => setLightboxIdx(i => (i !== null && i < visiblePhotos.length - 1) ? i + 1 : i)
  const prevPhoto     = () => setLightboxIdx(i => (i !== null && i > 0) ? i - 1 : i)
  const goToPhoto     = (idx: number) => setLightboxIdx(idx)

  const handleDownload = useCallback(async (photo: GalleryPhoto) => {
    setDownloading(photo.id)
    try {
      await fetch(`/api/gallery/download`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ photoId: photo.id, weddingId }),
      })
      Events.photoDownloaded(weddingId, guestId, photo.id)

      const a   = document.createElement('a')
      a.href    = photo.url
      a.download = photo.caption ? `${photo.caption}.jpg` : `photo-${photo.id}.jpg`
      a.target  = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      // silent fail
    } finally {
      setDownloading(null)
    }
  }, [weddingId, guestId])

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <section className="py-20 px-6">
        <div className="text-center mb-16">
          <p className="font-body text-xs tracking-[0.3em] uppercase text-ivory/20 mb-3">Gallery</p>
          <GoldDivider className="mx-auto" />
        </div>
        <div className="columns-2 md:columns-3 gap-2 max-w-4xl mx-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="skeleton break-inside-avoid mb-2 rounded"
              style={{ aspectRatio: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '1/1' : '4/3' }}
            />
          ))}
        </div>
      </section>
    )
  }

  /* ── Empty state ── */
  if (photos.length === 0) {
    return (
      <section
        id="section-gallery"
        className="relative py-20 px-6"
        aria-labelledby="gallery-heading"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <p className="font-body tracking-[0.3em] uppercase mb-3"
            style={{ fontSize: '0.65rem', color: 'rgba(12, 168, 110, 0.5)' }}>
            Gallery
          </p>
          <h2 id="gallery-heading"
            className="font-display text-ivory/80 mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 300, fontStyle: 'italic' }}>
            Our moments
          </h2>
          <GoldDivider className="mx-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-sm mx-auto text-center"
        >
          <div className="grid grid-cols-3 gap-1.5 mb-8 max-w-xs mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded aspect-square"
                style={{
                  background: `rgba(12, 168, 110, ${0.03 + (i % 3) * 0.02})`,
                  border: '1px solid rgba(12, 168, 110, 0.08)',
                }}
              />
            ))}
          </div>
          <p className="font-body text-ivory/25 text-xs tracking-widest uppercase">
            Photos coming soon
          </p>
        </motion.div>
      </section>
    )
  }

  /* ── Gallery with photos ── */
  return (
    <>
      <section
        ref={sectionRef}
        id="section-gallery"
        className="relative py-20 px-6"
        aria-labelledby="gallery-heading"
        onFocus={handleSectionVisible}
      >
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          onViewportEnter={handleSectionVisible}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <p className="font-body tracking-[0.3em] uppercase mb-3"
            style={{ fontSize: '0.65rem', color: 'rgba(12, 168, 110, 0.5)' }}>
            Gallery
          </p>
          <h2 id="gallery-heading"
            className="font-display text-ivory/80 mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 300, fontStyle: 'italic' }}>
            Our moments
          </h2>
          <GoldDivider className="mx-auto" />
        </motion.div>

        {/* Album filter tabs */}
        {albums.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            <button
              onClick={() => handleAlbumChange(null)}
              className={`px-4 py-1.5 text-xs tracking-widest uppercase transition-colors border ${
                activeAlbum === null
                  ? 'border-emerald-DEFAULT/40 text-emerald-DEFAULT bg-emerald-DEFAULT/8'
                  : 'border-white/10 text-ivory/35 hover:border-white/20 hover:text-ivory/60'
              }`}
              aria-pressed={activeAlbum === null}
            >
              All ({photos.length})
            </button>
            {albums.map(album => (
              <button
                key={album.id}
                onClick={() => handleAlbumChange(album.id)}
                className={`px-4 py-1.5 text-xs tracking-widest uppercase transition-colors border ${
                  activeAlbum === album.id
                    ? 'border-emerald-DEFAULT/40 text-emerald-DEFAULT bg-emerald-DEFAULT/8'
                    : 'border-white/10 text-ivory/35 hover:border-white/20 hover:text-ivory/60'
                }`}
                aria-pressed={activeAlbum === album.id}
              >
                {album.name} ({photos.filter(p => p.album_id === album.id).length})
              </button>
            ))}
          </div>
        )}

        {/* Masonry grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAlbum ?? 'all'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="columns-2 md:columns-3 gap-2 max-w-4xl mx-auto"
          >
            {displayedPhotos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: (i % 6) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="break-inside-avoid mb-2 relative group cursor-pointer overflow-hidden rounded"
                onClick={() => openLightbox(i)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && openLightbox(i)}
                aria-label={`View photo ${i + 1}${photo.caption ? `: ${photo.caption}` : ''}`}
              >
                <Image
                  src={photo.thumbnail_url ?? photo.url}
                  alt={photo.caption ?? `Gallery photo ${i + 1}`}
                  width={photo.width ?? 600}
                  height={photo.height ?? 400}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 33vw"
                  loading="lazy"
                />
                {/* Expand icon on hover */}
                <div className="absolute inset-0 bg-obsidian/0 group-hover:bg-obsidian/40 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(12,168,110,0.9)" strokeWidth="2" strokeLinecap="round">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </div>
                </div>
                {/* Caption */}
                {photo.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-obsidian/80 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-ivory/80 font-body text-xs leading-tight">{photo.caption}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* ── Gallery CTA — always visible when photos exist ── */}
        {visiblePhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative mt-2"
          >
            {/* Gradient fade only when photos are clipped */}
            {hiddenCount > 0 && (
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-full left-0 right-0 h-28"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(8,12,10,0.88))' }}
              />
            )}

            <div className="flex justify-center pt-6">
              {galleryHref ? (
                <Link
                  href={galleryHref}
                  className="group flex items-center gap-2.5 px-7 py-3.5 border border-emerald-DEFAULT/30 text-emerald-DEFAULT/70 hover:text-emerald-DEFAULT hover:border-emerald-DEFAULT/60 text-xs tracking-[0.15em] uppercase transition-all duration-200 hover:bg-emerald-DEFAULT/5"
                >
                  {/* grid icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:scale-110">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                  </svg>
                  {hiddenCount > 0
                    ? `View all ${visiblePhotos.length} photos`
                    : 'Open full gallery'}
                  {/* arrow */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              ) : (
                /* fallback: inline expand when no galleryHref configured */
                hiddenCount > 0 ? (
                  <button
                    onClick={() => setShowAll(true)}
                    className="group flex items-center gap-2.5 px-7 py-3.5 border border-emerald-DEFAULT/30 text-emerald-DEFAULT/70 hover:text-emerald-DEFAULT hover:border-emerald-DEFAULT/60 text-xs tracking-[0.15em] uppercase transition-all duration-200 hover:bg-emerald-DEFAULT/5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                    </svg>
                    View all {visiblePhotos.length} photos
                    <span className="text-ivory/30">+{hiddenCount} more</span>
                  </button>
                ) : null
              )}
            </div>
          </motion.div>
        )}

        {/* Download hint */}
        {allowDownloads && visiblePhotos.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8 text-xs text-ivory/30 tracking-wider"
          >
            Click any photo to view full size &amp; download
          </motion.p>
        )}
      </section>

      {/* Lightbox — always operates on full visiblePhotos so navigation works across all photos */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <PhotoLightbox
            photos={visiblePhotos}
            currentIndex={lightboxIdx}
            onClose={closeLightbox}
            onNext={nextPhoto}
            onPrev={prevPhoto}
            goToIndex={goToPhoto}
            onDownload={handleDownload}
            allowDownload={allowDownloads}
          />
        )}
      </AnimatePresence>

      {/* Download toast */}
      <AnimatePresence>
        {downloading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 right-6 z-[400] px-4 py-2 rounded-full bg-obsidian border border-emerald-DEFAULT/30 text-emerald-DEFAULT text-xs tracking-wider flex items-center gap-2"
          >
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Preparing download…
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
