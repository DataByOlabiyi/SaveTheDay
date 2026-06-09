'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { GalleryAlbum, GalleryPhoto } from '@/lib/db/types'
import { MAX_GALLERY_PHOTOS } from '@/lib/constants'

interface GalleryManagerProps {
  weddingId: string
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const CARD  = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 }
const INPUT = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }

const SUGGESTED_ALBUMS = [
  'Pre-Wedding Shoot',
  'Engagement Session',
  'Traditional Ceremony',
  'Church / Nikah',
  'Reception',
  'After Party',
]

// ── Album onboarding (first-time empty state) ──────────────────────────────────

function AlbumOnboarding({
  onCreateAlbum,
  creating,
}: {
  onCreateAlbum: (name: string) => Promise<void>
  creating:      boolean
}) {
  const [customName, setCustomName]   = useState('')
  const [showCustom, setShowCustom]   = useState(false)
  const [activeSlug, setActiveSlug]   = useState<string | null>(null)

  const handleSuggestion = async (name: string) => {
    setActiveSlug(name)
    await onCreateAlbum(name)
    setActiveSlug(null)
  }

  const handleCustom = async () => {
    if (!customName.trim()) return
    await onCreateAlbum(customName.trim())
    setCustomName('')
    setShowCustom(false)
  }

  return (
    <div className="py-6 space-y-5">
      <div>
        <p className="font-body text-[10px] tracking-[0.22em] uppercase text-ivory/25 mb-3">
          Suggested albums
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUGGESTED_ALBUMS.map(name => (
            <motion.button
              key={name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSuggestion(name)}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-body text-sm text-ivory/60 hover:text-ivory/85 text-left transition-colors disabled:opacity-40"
              style={{ ...CARD, borderStyle: 'dashed' }}
            >
              {activeSlug === name ? (
                <span className="w-3 h-3 rounded-full border border-gold/40 border-t-gold animate-spin shrink-0" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,0.5)" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              )}
              {name}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Custom album */}
      <div>
        <p className="font-body text-[10px] tracking-[0.22em] uppercase text-ivory/25 mb-2">
          Or create a custom album
        </p>
        {showCustom ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Album name"
              className="flex-1 px-3.5 py-2.5 rounded-xl font-body text-sm text-ivory/85 placeholder-ivory/25 focus:outline-none focus:border-gold/40 transition-all"
              style={INPUT}
              onKeyDown={e => e.key === 'Enter' && handleCustom()}
              autoFocus
            />
            <button
              onClick={handleCustom}
              disabled={!customName.trim() || creating}
              className="font-body text-obsidian text-xs tracking-widest uppercase px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40"
              style={{ background: '#C9A84C' }}
              onMouseEnter={e => { (e.currentTarget.style.background = '#E8CC7A') }}
              onMouseLeave={e => { (e.currentTarget.style.background = '#C9A84C') }}
            >
              Create
            </button>
            <button onClick={() => setShowCustom(false)}
              className="font-body text-xs text-ivory/30 hover:text-ivory/60 px-3 transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustom(true)}
            className="font-body text-xs text-ivory/35 hover:text-ivory/60 transition-colors tracking-wide underline underline-offset-4"
          >
            + Custom album name
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function GalleryManager({ weddingId }: GalleryManagerProps) {
  const [albums,       setAlbums]       = useState<GalleryAlbum[]>([])
  const [photos,       setPhotos]       = useState<GalleryPhoto[]>([])
  const [loading,      setLoading]      = useState(true)
  const [activeAlbum,  setActiveAlbum]  = useState<string | null>(null)
  const [uploading,    setUploading]    = useState(false)
  const [uploadPct,    setUploadPct]    = useState(0)
  const [uploadLabel,  setUploadLabel]  = useState('')
  const [creating,     setCreating]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState<string | null>(null)
  const [addingAlbum,  setAddingAlbum]  = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const usedSlots   = photos.length
  const remaining   = MAX_GALLERY_PHOTOS - usedSlots
  const isAtLimit   = usedSlots >= MAX_GALLERY_PHOTOS
  const isNearLimit = remaining <= 5 && !isAtLimit
  const fillPct     = Math.min((usedSlots / MAX_GALLERY_PHOTOS) * 100, 100)

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/gallery?weddingId=${weddingId}`)
      const data = await res.json()
      setAlbums(data.albums ?? [])
      setPhotos(data.photos ?? [])
    } catch { setError('Failed to load gallery') }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [weddingId])

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }

  const handleCreateAlbum = async (name: string) => {
    setCreating(true)
    try {
      const res = await fetch('/api/gallery', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'album', weddingId, name, sort_order: albums.length }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setAlbums(prev => [...prev, data.album])
      setActiveAlbum(data.album.id)
      setAddingAlbum(false)
      setNewAlbumName('')
      showSuccess('Album created')
    } catch { setError('Failed to create album') }
    finally { setCreating(false) }
  }

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm('Delete this album? Photos will be unassigned.')) return
    try {
      await fetch(`/api/gallery?type=album&id=${albumId}&weddingId=${weddingId}`, { method: 'DELETE' })
      setAlbums(prev => prev.filter(a => a.id !== albumId))
      if (activeAlbum === albumId) setActiveAlbum(null)
      showSuccess('Album deleted')
    } catch { setError('Failed to delete album') }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return
    try {
      await fetch(`/api/gallery?type=photo&id=${photoId}&weddingId=${weddingId}`, { method: 'DELETE' })
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      showSuccess('Photo deleted')
    } catch { setError('Failed to delete photo') }
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return
    const fileArr  = Array.from(files)
    const slotsLeft = MAX_GALLERY_PHOTOS - photos.length
    if (slotsLeft <= 0) { setError('Gallery is full — delete some photos to upload new ones.'); return }
    const toUpload = fileArr.slice(0, slotsLeft)
    if (fileArr.length > slotsLeft)
      setError(`Only ${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} remaining — uploading the first ${slotsLeft}.`)

    setUploading(true)
    let uploaded = 0

    for (let idx = 0; idx < toUpload.length; idx++) {
      const file     = toUpload[idx]
      const formData = new FormData()
      formData.append('file',      file)
      formData.append('weddingId', weddingId)
      if (activeAlbum) formData.append('albumId', activeAlbum)
      setUploadLabel(`Uploading ${idx + 1} of ${toUpload.length}…`)
      try {
        const res = await fetch('/api/gallery/upload', { method: 'POST', body: formData })
        if (res.ok) { const d = await res.json(); setPhotos(prev => [...prev, d.photo]); uploaded++ }
        else { const err = await res.json(); setError(err.error ?? 'Upload failed') }
      } catch { setError('Upload failed') }
      setUploadPct(Math.round(((idx + 1) / toUpload.length) * 100))
    }

    setUploading(false); setUploadPct(0); setUploadLabel('')
    if (uploaded > 0) showSuccess(`${uploaded} photo${uploaded !== 1 ? 's' : ''} uploaded`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const visiblePhotos = activeAlbum ? photos.filter(p => p.album_id === activeAlbum) : photos

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Toast */}
      <AnimatePresence>
        {(success || error) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl font-body text-xs"
            style={success
              ? { background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)', color: '#4ade80' }
              : { background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171' }
            }
          >
            <span>{success || error}</span>
            <button onClick={() => { setSuccess(null); setError(null) }} className="ml-3 opacity-60 hover:opacity-100 transition-opacity">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Storage bar */}
      <div className="p-4 rounded-2xl space-y-2" style={CARD}>
        <div className="flex items-center justify-between">
          <span className="font-body text-[10px] tracking-[0.22em] uppercase text-ivory/30">Gallery Storage</span>
          <span className={`font-body text-xs tabular-nums ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-ivory/40'}`}>
            {usedSlots} / {MAX_GALLERY_PHOTOS} photos
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: isAtLimit   ? '#f87171' :
                          isNearLimit ? '#fbbf24' :
                          'linear-gradient(90deg, #C9A84C, #E8CC7A)',
            }}
          />
        </div>
        <p className="font-body text-[10px] text-ivory/20">
          {isAtLimit   ? 'Gallery full — delete photos to upload more.' :
           isNearLimit ? `${remaining} slot${remaining !== 1 ? 's' : ''} remaining.` :
           `${remaining} of ${MAX_GALLERY_PHOTOS} slots available.`}
        </p>
      </div>

      {/* Albums section */}
      {albums.length === 0 ? (
        /* ── First-time onboarding ── */
        <div className="rounded-2xl p-5" style={CARD}>
          <p className="font-display text-base text-ivory/70 mb-1" style={{ fontWeight: 300 }}>Create your first album</p>
          <p className="font-body text-xs text-ivory/30 mb-4 leading-relaxed">
            Organise your photos into albums. Only albums with photos will be shown to your guests.
          </p>
          <AlbumOnboarding onCreateAlbum={handleCreateAlbum} creating={creating} />
        </div>
      ) : (
        /* ── Albums exist ── */
        <div className="space-y-3">
          {/* Album tabs header */}
          <div className="flex items-center justify-between">
            <p className="font-body text-[10px] tracking-[0.22em] uppercase text-ivory/25">Albums</p>
            {!addingAlbum && (
              <button
                onClick={() => setAddingAlbum(true)}
                className="font-body text-xs text-gold/55 hover:text-gold transition-colors"
              >
                + New Album
              </button>
            )}
          </div>

          {/* Album pills */}
          <div className="flex flex-wrap gap-2">
            {/* All */}
            <button
              onClick={() => setActiveAlbum(null)}
              className="px-3 py-1.5 font-body text-xs tracking-wide rounded-xl transition-colors"
              style={activeAlbum === null
                ? { background: 'rgba(201,168,76,0.09)', border: '1px solid rgba(201,168,76,0.28)', color: '#C9A84C' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(250,247,242,0.4)' }
              }
            >
              All ({photos.length})
            </button>

            {albums.map(album => {
              const count   = photos.filter(p => p.album_id === album.id).length
              const isEmpty = count === 0
              const isActive = activeAlbum === album.id
              return (
                <div key={album.id} className="relative group">
                  <button
                    onClick={() => setActiveAlbum(album.id === activeAlbum ? null : album.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 font-body text-xs tracking-wide rounded-xl transition-all"
                    style={isActive
                      ? { background: 'rgba(201,168,76,0.09)', border: '1px solid rgba(201,168,76,0.28)', color: '#C9A84C' }
                      : isEmpty
                      ? { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(250,247,242,0.25)' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(250,247,242,0.45)' }
                    }
                  >
                    {album.name}
                    <span className="text-[10px] opacity-60">({count})</span>
                    {isEmpty && (
                      <span className="font-body text-[9px] px-1 py-px rounded"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(250,247,242,0.2)' }}>
                        hidden
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteAlbum(album.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/70 text-white text-[10px] items-center justify-center hidden group-hover:flex"
                    aria-label={`Delete album ${album.name}`}
                  >×</button>
                </div>
              )
            })}
          </div>

          {/* Empty albums hint */}
          {albums.every(a => photos.filter(p => p.album_id === a.id).length === 0) && (
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl"
              style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.10)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-px">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              <p className="font-body text-[11px] text-gold/65 leading-relaxed">
                Select an album, then upload photos. Albums stay hidden from guests until they have at least one photo.
              </p>
            </div>
          )}

          {/* New album inline form */}
          <AnimatePresence>
            {addingAlbum && (
              <motion.div key="new-album" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2">
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={e => setNewAlbumName(e.target.value)}
                  placeholder="Album name"
                  className="flex-1 px-3.5 py-2.5 rounded-xl font-body text-sm text-ivory/85 placeholder-ivory/25 focus:outline-none focus:border-gold/40 transition-all"
                  style={INPUT}
                  onKeyDown={e => e.key === 'Enter' && handleCreateAlbum(newAlbumName)}
                  autoFocus
                />
                <button
                  onClick={() => handleCreateAlbum(newAlbumName)}
                  disabled={!newAlbumName.trim() || creating}
                  className="font-body text-obsidian text-xs tracking-widest uppercase px-4 py-2 rounded-xl transition-colors disabled:opacity-40"
                  style={{ background: '#C9A84C' }}
                  onMouseEnter={e => { (e.currentTarget.style.background = '#E8CC7A') }}
                  onMouseLeave={e => { (e.currentTarget.style.background = '#C9A84C') }}
                >
                  Create
                </button>
                <button onClick={() => { setAddingAlbum(false); setNewAlbumName('') }}
                  className="font-body text-xs text-ivory/30 hover:text-ivory/60 px-3 transition-colors">
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Upload zone — only show when albums exist */}
      {albums.length > 0 && (
        <div
          className={`rounded-2xl p-8 text-center transition-all ${
            isAtLimit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          style={{
            border: isAtLimit
              ? '1px dashed rgba(248,113,113,0.2)'
              : activeAlbum
              ? '1px dashed rgba(201,168,76,0.3)'
              : '1px dashed rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.015)',
            borderRadius: 16,
          }}
          onClick={() => !uploading && !isAtLimit && fileInputRef.current?.click()}
          onDrop={e => { e.preventDefault(); !uploading && !isAtLimit && handleFileUpload(e.dataTransfer.files) }}
          onDragOver={e => e.preventDefault()}
          role="button"
          tabIndex={isAtLimit ? -1 : 0}
          onKeyDown={e => e.key === 'Enter' && !isAtLimit && fileInputRef.current?.click()}
          aria-label={isAtLimit ? 'Gallery is full' : 'Upload photos'}
          aria-disabled={isAtLimit}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={e => e.target.files && handleFileUpload(e.target.files)}
            disabled={isAtLimit}
          />

          {uploading ? (
            <div>
              <div className="h-1.5 rounded-full overflow-hidden mb-3 mx-auto max-w-xs" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <motion.div
                  animate={{ width: `${uploadPct}%` }}
                  transition={{ duration: 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #C9A84C, #E8CC7A)' }}
                />
              </div>
              <p className="font-body text-xs text-ivory/40 tracking-wider">{uploadLabel || `Uploading… ${uploadPct}%`}</p>
            </div>
          ) : isAtLimit ? (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
                <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M6.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
              </svg>
              <p className="font-body text-sm text-red-400/60">Gallery full ({MAX_GALLERY_PHOTOS}/{MAX_GALLERY_PHOTOS})</p>
              <p className="font-body text-xs text-ivory/20 mt-1">Delete photos to make room</p>
            </>
          ) : (
            <>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                stroke={activeAlbum ? 'rgba(201,168,76,0.4)' : 'rgba(250,247,242,0.2)'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="font-body text-sm text-ivory/45">
                {isNearLimit
                  ? `${remaining} slot${remaining !== 1 ? 's' : ''} left — click to upload`
                  : 'Click to upload or drag & drop'}
              </p>
              <p className="font-body text-xs text-ivory/20 mt-1">JPEG, PNG, WebP — max 10 MB each</p>
              {activeAlbum ? (
                <p className="font-body text-xs text-gold/50 mt-1.5">
                  → Adding to: {albums.find(a => a.id === activeAlbum)?.name}
                </p>
              ) : (
                <p className="font-body text-xs text-ivory/20 mt-1.5">
                  Select an album above to organise your photos
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Photo grid */}
      {visiblePhotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {visiblePhotos.map(photo => (
            <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Image
                src={photo.thumbnail_url ?? photo.url}
                alt={photo.caption ?? 'Gallery photo'}
                fill className="object-cover"
                sizes="120px"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all flex items-center justify-center">
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center transition-opacity"
                  aria-label="Delete photo"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
              {photo.download_count > 0 && (
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded font-body text-ivory/50"
                  style={{ background: 'rgba(0,0,0,0.6)', fontSize: '0.55rem' }}>
                  ↓{photo.download_count}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty album selected */}
      {albums.length > 0 && visiblePhotos.length === 0 && !uploading && (
        <p className="text-center font-body text-ivory/20 text-sm tracking-wider py-4">
          {activeAlbum
            ? `No photos in "${albums.find(a => a.id === activeAlbum)?.name}" yet`
            : 'No photos uploaded yet'}
        </p>
      )}

    </div>
  )
}
