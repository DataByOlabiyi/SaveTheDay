'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { GalleryAlbum, GalleryPhoto } from '@/lib/db/types'
import { MAX_GALLERY_PHOTOS } from '@/lib/constants'

interface GalleryManagerProps {
  weddingId:   string
  adminSecret: string
}

export function GalleryManager({ weddingId, adminSecret }: GalleryManagerProps) {
  const [albums, setAlbums]         = useState<GalleryAlbum[]>([])
  const [photos, setPhotos]         = useState<GalleryPhoto[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadLabel, setUploadLabel]       = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)
  const [newAlbumName, setNewAlbumName] = useState('')
  const [addingAlbum, setAddingAlbum]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const usedSlots    = photos.length
  const remaining    = MAX_GALLERY_PHOTOS - usedSlots
  const isAtLimit    = usedSlots >= MAX_GALLERY_PHOTOS
  const isNearLimit  = remaining <= 5 && !isAtLimit
  const fillPct      = Math.min((usedSlots / MAX_GALLERY_PHOTOS) * 100, 100)

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/gallery?weddingId=${weddingId}`)
      const data = await res.json()
      setAlbums(data.albums ?? [])
      setPhotos(data.photos ?? [])
    } catch {
      setError('Failed to load gallery')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [weddingId])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return
    try {
      const res = await fetch('/api/gallery', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'album', weddingId, secret: adminSecret,
          name: newAlbumName.trim(), sort_order: albums.length,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setAlbums(prev => [...prev, data.album])
      setNewAlbumName('')
      setAddingAlbum(false)
      showSuccess('Album created')
    } catch {
      setError('Failed to create album')
    }
  }

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm('Delete this album? Photos will be unassigned.')) return
    try {
      await fetch(`/api/gallery?type=album&id=${albumId}&weddingId=${weddingId}&secret=${encodeURIComponent(adminSecret)}`, {
        method: 'DELETE',
      })
      setAlbums(prev => prev.filter(a => a.id !== albumId))
      if (activeAlbum === albumId) setActiveAlbum(null)
      showSuccess('Album deleted')
    } catch {
      setError('Failed to delete album')
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return
    try {
      await fetch(`/api/gallery?type=photo&id=${photoId}&weddingId=${weddingId}&secret=${encodeURIComponent(adminSecret)}`, {
        method: 'DELETE',
      })
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      showSuccess('Photo deleted')
    } catch {
      setError('Failed to delete photo')
    }
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return

    // Client-side cap: trim selection to available slots
    const fileArr     = Array.from(files)
    const slotsLeft   = MAX_GALLERY_PHOTOS - photos.length

    if (slotsLeft <= 0) {
      setError(`Gallery is full — delete some photos to upload new ones.`)
      return
    }

    const toUpload = fileArr.slice(0, slotsLeft)
    if (fileArr.length > slotsLeft) {
      setError(`Only ${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} remaining — uploading the first ${slotsLeft}.`)
    }

    setUploading(true)
    let uploaded = 0

    for (let idx = 0; idx < toUpload.length; idx++) {
      const file     = toUpload[idx]
      const formData = new FormData()
      formData.append('file',      file)
      formData.append('weddingId', weddingId)
      formData.append('secret',    adminSecret)
      if (activeAlbum) formData.append('albumId', activeAlbum)

      setUploadLabel(`Uploading ${idx + 1} of ${toUpload.length}…`)

      try {
        const res = await fetch('/api/gallery/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          setPhotos(prev => [...prev, data.photo])
          uploaded++
        } else {
          const err = await res.json()
          setError(err.error ?? 'Upload failed')
        }
      } catch {
        setError('Upload failed')
      }

      setUploadProgress(Math.round(((idx + 1) / toUpload.length) * 100))
    }

    setUploading(false)
    setUploadProgress(0)
    setUploadLabel('')
    if (uploaded > 0) showSuccess(`${uploaded} photo${uploaded !== 1 ? 's' : ''} uploaded`)
    // Reset the input so the same files can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const visiblePhotos = activeAlbum ? photos.filter(p => p.album_id === activeAlbum) : photos

  if (loading) {
    return <div className="text-center py-8 text-ivory/20 text-sm tracking-wider">Loading gallery…</div>
  }

  return (
    <div className="space-y-6">

      {/* ── Toast messages ── */}
      <AnimatePresence>
        {(success || error) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`text-xs px-4 py-2.5 tracking-wider flex items-center justify-between ${
              success
                ? 'bg-green-900/40 border border-green-500/20 text-green-300'
                : 'bg-red-900/40 border border-red-500/20 text-red-300'
            }`}
          >
            <span>{success || error}</span>
            <button
              onClick={() => { setSuccess(null); setError(null) }}
              className="ml-3 opacity-60 hover:opacity-100 transition-opacity"
            >×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Photo count & progress ── */}
      <div className="admin-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-widest uppercase text-ivory/30">Gallery Storage</span>
          <span className={`text-xs font-medium tabular-nums ${
            isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-ivory/50'
          }`}>
            {usedSlots} / {MAX_GALLERY_PHOTOS} photos
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isAtLimit    ? 'bg-red-500' :
              isNearLimit  ? 'bg-amber-400' :
              'bg-gradient-to-r from-emerald-DEFAULT to-emerald-light'
            }`}
          />
        </div>
        {isAtLimit ? (
          <p className="text-[11px] text-red-400/70">Gallery full — delete photos to upload more.</p>
        ) : isNearLimit ? (
          <p className="text-[11px] text-amber-400/70">{remaining} slot{remaining !== 1 ? 's' : ''} remaining.</p>
        ) : (
          <p className="text-[11px] text-ivory/20">{remaining} of {MAX_GALLERY_PHOTOS} slots available.</p>
        )}
      </div>

      {/* ── Albums ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs tracking-widest uppercase text-ivory/30">Albums</h3>
          <button
            onClick={() => setAddingAlbum(true)}
            className="text-xs text-emerald-DEFAULT/60 hover:text-emerald-DEFAULT transition-colors"
          >
            + New Album
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => setActiveAlbum(null)}
            className={`px-3 py-1.5 text-xs tracking-wider uppercase transition-colors border ${
              activeAlbum === null
                ? 'border-emerald-DEFAULT/40 text-emerald-DEFAULT bg-emerald-DEFAULT/8'
                : 'border-white/10 text-ivory/35 hover:border-white/20 hover:text-ivory/60'
            }`}
          >
            All ({photos.length})
          </button>
          {albums.map(album => (
            <div key={album.id} className="relative group">
              <button
                onClick={() => setActiveAlbum(album.id === activeAlbum ? null : album.id)}
                className={`px-3 py-1.5 text-xs tracking-wider uppercase transition-colors border ${
                  activeAlbum === album.id
                    ? 'border-emerald-DEFAULT/40 text-emerald-DEFAULT bg-emerald-DEFAULT/8'
                    : 'border-white/10 text-ivory/35 hover:border-white/20 hover:text-ivory/60'
                }`}
              >
                {album.name} ({photos.filter(p => p.album_id === album.id).length})
              </button>
              <button
                onClick={() => handleDeleteAlbum(album.id)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/70 text-white text-xs items-center justify-center hidden group-hover:flex"
                aria-label={`Delete album ${album.name}`}
              >×</button>
            </div>
          ))}
        </div>

        {addingAlbum && (
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newAlbumName}
              onChange={e => setNewAlbumName(e.target.value)}
              placeholder="Album name"
              className="rsvp-input flex-1 py-1.5 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleCreateAlbum()}
              autoFocus
            />
            <button onClick={handleCreateAlbum} className="btn-gold px-4 py-1.5 text-xs">Create</button>
            <button onClick={() => setAddingAlbum(false)} className="text-ivory/30 hover:text-ivory/60 transition-colors text-xs px-2">Cancel</button>
          </div>
        )}
      </div>

      {/* ── Upload zone ── */}
      <div
        className={[
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isAtLimit
            ? 'border-red-500/20 opacity-50 cursor-not-allowed'
            : 'border-emerald-DEFAULT/20 hover:border-emerald-DEFAULT/40 cursor-pointer',
        ].join(' ')}
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
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3 mx-auto max-w-xs">
              <motion.div
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.2 }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #0CA86E, #3DD9A0)' }}
              />
            </div>
            <p className="text-xs text-ivory/40 tracking-wider">{uploadLabel || `Uploading… ${uploadProgress}%`}</p>
          </div>

        ) : isAtLimit ? (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
              <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
            </svg>
            <p className="text-sm text-red-400/60">Gallery full ({MAX_GALLERY_PHOTOS}/{MAX_GALLERY_PHOTOS})</p>
            <p className="text-xs text-ivory/20 mt-1">Delete existing photos to make room</p>
          </>

        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(12,168,110,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="text-sm text-ivory/50">
              {isNearLimit
                ? `${remaining} slot${remaining !== 1 ? 's' : ''} left — click to upload`
                : 'Click to upload or drag & drop photos'}
            </p>
            <p className="text-xs text-ivory/20 mt-1">JPEG, PNG, WebP — max 10 MB each</p>
            {activeAlbum && (
              <p className="text-xs text-emerald-DEFAULT/50 mt-1">
                → Adding to: {albums.find(a => a.id === activeAlbum)?.name ?? 'album'}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Photo grid ── */}
      {visiblePhotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {visiblePhotos.map(photo => (
            <div key={photo.id} className="relative group aspect-square rounded overflow-hidden">
              <Image
                src={photo.thumbnail_url ?? photo.url}
                alt={photo.caption ?? 'Gallery photo'}
                fill
                className="object-cover"
                sizes="120px"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center gap-2">
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center transition-opacity"
                  aria-label="Delete photo"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
              {/* Download count badge */}
              {photo.download_count > 0 && (
                <div className="absolute bottom-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-ivory/60" style={{ fontSize: '0.55rem' }}>
                  ↓{photo.download_count}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {visiblePhotos.length === 0 && (
        <p className="text-center text-ivory/20 text-sm tracking-wider py-4">
          No photos yet — upload some above
        </p>
      )}
    </div>
  )
}
