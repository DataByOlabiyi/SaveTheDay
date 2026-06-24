'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { GoldDivider } from '@/components/atoms/GoldText'
import { PhotoLightbox } from '@/components/molecules/PhotoLightbox'
import { ParticleField } from '@/components/atoms/ParticleField'
import { Events } from '@/lib/analytics/events'
import { applyWatermark } from '@/lib/utils/watermark'
import type { Wedding, GalleryAlbum, GalleryPhoto } from '@/lib/db/types'

interface FullGalleryPageProps {
  wedding:        Wedding
  albums:         GalleryAlbum[]
  photos:         GalleryPhoto[]
  guestId?:       string
  backHref:       string
  allowDownloads: boolean
}

export function FullGalleryPage({
  wedding, albums, photos,
  guestId, backHref, allowDownloads,
}: FullGalleryPageProps) {
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const visiblePhotos      = activeAlbum ? photos.filter(p => p.album_id === activeAlbum) : photos
  const watermarkDownloads = wedding.config.watermark_downloads === true
  const watermarkText      = `${wedding.couple_names.name1} & ${wedding.couple_names.name2} • SaveTheDay`

  const openLightbox  = (idx: number) => setLightboxIdx(idx)
  const closeLightbox = () => setLightboxIdx(null)
  const nextPhoto     = () => setLightboxIdx(i => (i !== null && i < visiblePhotos.length - 1) ? i + 1 : i)
  const prevPhoto     = () => setLightboxIdx(i => (i !== null && i > 0) ? i - 1 : i)
  const goToPhoto     = (idx: number) => setLightboxIdx(idx)

  const handleDownload = useCallback(async (photo: GalleryPhoto) => {
    setDownloading(photo.id)
    try {
      await fetch('/api/gallery/download', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ photoId: photo.id, weddingId: wedding.id }),
      })
      Events.photoDownloaded(wedding.id, guestId, photo.id)

      const filename = photo.caption ? `${photo.caption}.jpg` : `photo-${photo.id}.jpg`

      if (watermarkDownloads) {
        const blob = await applyWatermark(photo, watermarkText)
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const a    = document.createElement('a')
        a.href     = photo.url
        a.download = filename
        a.target   = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch {
      // silent fail
    } finally {
      setDownloading(null)
    }
  }, [wedding.id, guestId, watermarkDownloads, watermarkText])

  const { couple_names } = wedding

  return (
    <div className="min-h-screen bg-obsidian">
      <ParticleField className="fixed inset-0 pointer-events-none" count={20} />

      {/* ── Top nav bar ── */}
      <div className="sticky top-0 z-40 bg-obsidian/90 backdrop-blur-md border-b border-white/[0.05]">
        <div className="flex items-center justify-between px-5 py-3 max-w-4xl mx-auto">

          {/* Back */}
          <Link
            href={backHref}
            className="group flex items-center gap-2 text-ivory/40 hover:text-ivory/80 transition-colors"
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-xs tracking-[0.15em] uppercase">Invitation</span>
          </Link>

          {/* Couple names */}
          <p className="font-display text-ivory/50 text-sm italic">
            {couple_names.name1} &amp; {couple_names.name2}
          </p>

          {/* Photo count */}
          <p className="text-xs text-ivory/25 tabular-nums tracking-wider">
            {photos.length} photo{photos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Page content ── */}
      <main className="relative px-5 pb-24">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center pt-14 pb-10"
        >
          <p className="font-body tracking-[0.3em] uppercase mb-3"
            style={{ fontSize: '0.65rem', color: 'rgba(12, 168, 110, 0.5)' }}>
            Gallery
          </p>
          <h1 className="font-display text-ivory/80 mb-4"
            style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)', fontWeight: 300, fontStyle: 'italic' }}>
            Our moments
          </h1>
          <GoldDivider className="mx-auto" />
        </motion.div>

        {/* ── Empty state ── */}
        {photos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center pt-12"
          >
            <div className="grid grid-cols-3 gap-1.5 mb-8 max-w-[180px] mx-auto">
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
        )}

        {photos.length > 0 && (
          <>
            {/* ── Album filter tabs ── */}
            {albums.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-2 justify-center mb-8"
              >
                <button
                  onClick={() => setActiveAlbum(null)}
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
                    onClick={() => setActiveAlbum(album.id === activeAlbum ? null : album.id)}
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
              </motion.div>
            )}

            {/* ── Full masonry grid ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeAlbum ?? 'all'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="columns-2 md:columns-3 lg:columns-4 gap-2 max-w-5xl mx-auto"
              >
                {visiblePhotos.map((photo, i) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{
                      duration: 0.45,
                      delay: (i % 8) * 0.04,
                      ease: [0.22, 1, 0.36, 1],
                    }}
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
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      loading={i < 8 ? 'eager' : 'lazy'}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-obsidian/0 group-hover:bg-obsidian/35 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(12,168,110,0.9)" strokeWidth="2" strokeLinecap="round">
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

            {/* Download hint */}
            {allowDownloads && (
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-center mt-10 text-xs text-ivory/25 tracking-wider"
              >
                Tap any photo to view full size &amp; download
              </motion.p>
            )}
          </>
        )}
      </main>

      {/* ── Lightbox ── */}
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

      {/* ── Download toast ── */}
      <AnimatePresence>
        {downloading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
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
    </div>
  )
}
