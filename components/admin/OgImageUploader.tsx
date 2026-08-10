'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Wedding } from '@/lib/db/types'
import { OG_IMAGE_MAX_SIZE_BYTES, OG_IMAGE_ACCEPTED_TYPES } from '@/lib/constants'

interface OgImageUploaderProps {
  wedding:   Wedding
  onUpdated: (wedding: Wedding) => void
}

type Mode = 'empty' | 'crop' | 'uploading' | 'saved'

interface Pan { x: number; y: number }
interface FrameSize { w: number; h: number }

const MIN_ZOOM = 1
const MAX_ZOOM = 3

// Keeps the image's displayed edges outside (or flush with) the frame at
// every zoom level so the crop preview never shows a gap.
function clampPan(pan: Pan, scale: number, frame: FrameSize, natW: number, natH: number): Pan {
  const dispW = natW * scale
  const dispH = natH * scale
  const minX  = Math.min(0, frame.w - dispW)
  const minY  = Math.min(0, frame.h - dispH)
  return {
    x: Math.min(0, Math.max(minX, pan.x)),
    y: Math.min(0, Math.max(minY, pan.y)),
  }
}

function minScaleFor(frame: FrameSize, natW: number, natH: number): number {
  return Math.max(frame.w / natW, frame.h / natH)
}

export function OgImageUploader({ wedding, onUpdated }: OgImageUploaderProps) {
  const ogImageUrl = wedding.config.og_image_url

  const [mode, setMode]                       = useState<Mode>(ogImageUrl ? 'saved' : 'empty')
  const [dragOver, setDragOver]                = useState(false)
  const [pickError, setPickError]              = useState<string | null>(null)
  const [uploadError, setUploadError]          = useState<string | null>(null)
  const [uploadPct, setUploadPct]              = useState(0)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [removing, setRemoving]                = useState(false)
  const [removeError, setRemoveError]          = useState<string | null>(null)

  const [imgEl, setImgEl]         = useState<HTMLImageElement | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [zoom, setZoom]           = useState(1)
  const [pan, setPan]             = useState<Pan>({ x: 0, y: 0 })
  const [frameSize, setFrameSize] = useState<FrameSize>({ w: 0, h: 0 })

  const fileInputRef       = useRef<HTMLInputElement>(null)
  const frameRef            = useRef<HTMLDivElement>(null)
  const pointers            = useRef<Map<number, { x: number; y: number }>>(new Map())
  const dragLast            = useRef<{ x: number; y: number } | null>(null)
  const pinchStart          = useRef<{ dist: number; zoom: number } | null>(null)
  const centeredForImage    = useRef<HTMLImageElement | null>(null)

  // Mirrors zoom/frameSize/imgEl for use inside stable callbacks (wheel/pointer
  // handlers) without re-subscribing native listeners on every state change.
  const liveRef = useRef({ zoom, frameSize, imgEl })
  liveRef.current = { zoom, frameSize, imgEl }

  useEffect(() => {
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [objectUrl])

  // Measure the frame's actual rendered size (it's responsive up to 480px)
  // so the pan/zoom math is correct at any viewport width.
  useEffect(() => {
    if (mode !== 'crop' && mode !== 'uploading') return
    const el = frameRef.current
    if (!el) return
    const update = () => setFrameSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode])

  // Centers the image the first time both its natural size and the frame's
  // measured size are known for this particular image.
  useEffect(() => {
    if (mode !== 'crop' || !imgEl || frameSize.w === 0) return
    if (centeredForImage.current === imgEl) return
    const scale = minScaleFor(frameSize, imgEl.naturalWidth, imgEl.naturalHeight)
    const dispW = imgEl.naturalWidth * scale
    const dispH = imgEl.naturalHeight * scale
    setPan({ x: (frameSize.w - dispW) / 2, y: (frameSize.h - dispH) / 2 })
    centeredForImage.current = imgEl
  }, [mode, imgEl, frameSize])

  // Zooms around the frame's center point, re-clamping the pan so no gap
  // is ever exposed at the new zoom level.
  const applyZoom = useCallback((newZoomRaw: number) => {
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoomRaw))
    const { zoom: curZoom, frameSize: frame, imgEl: img } = liveRef.current

    if (!img || frame.w === 0) { setZoom(newZoom); return }

    const scale    = minScaleFor(frame, img.naturalWidth, img.naturalHeight)
    const oldScale = scale * curZoom
    const newScale = scale * newZoom

    setPan(prevPan => {
      const localX = (frame.w / 2 - prevPan.x) / oldScale
      const localY = (frame.h / 2 - prevPan.y) / oldScale
      const rawX   = frame.w / 2 - localX * newScale
      const rawY   = frame.h / 2 - localY * newScale
      return clampPan({ x: rawX, y: rawY }, newScale, frame, img.naturalWidth, img.naturalHeight)
    })
    setZoom(newZoom)
  }, [])

  // Non-passive wheel listener — React's synthetic onWheel is passive by
  // default, which silently ignores preventDefault() and lets the page scroll.
  useEffect(() => {
    if (mode !== 'crop') return
    const el = frameRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      applyZoom(liveRef.current.zoom - e.deltaY * 0.0015)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [mode, applyZoom])

  const handleFileSelected = (file: File) => {
    setPickError(null)

    if (!OG_IMAGE_ACCEPTED_TYPES.includes(file.type)) {
      setPickError('Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > OG_IMAGE_MAX_SIZE_BYTES) {
      setPickError('That photo is too large — max 8 MB.')
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setImgEl(img)
      setObjectUrl(url)
      setZoom(1)
      setUploadError(null)
      setMode('crop')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setPickError("That file couldn't be read. Please try a different photo.")
    }
    img.src = url
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values())
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: liveRef.current.zoom }
      dragLast.current = null
    } else {
      dragLast.current = { x: e.clientX, y: e.clientY }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = Array.from(pointers.current.values())
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      applyZoom(pinchStart.current.zoom * (dist / pinchStart.current.dist))
      return
    }

    if (pointers.current.size === 1 && dragLast.current) {
      const dx = e.clientX - dragLast.current.x
      const dy = e.clientY - dragLast.current.y
      dragLast.current = { x: e.clientX, y: e.clientY }

      const { frameSize: frame, imgEl: img, zoom: curZoom } = liveRef.current
      if (!img || frame.w === 0) return
      const scale = minScaleFor(frame, img.naturalWidth, img.naturalHeight) * curZoom
      setPan(prevPan => clampPan({ x: prevPan.x + dx, y: prevPan.y + dy }, scale, frame, img.naturalWidth, img.naturalHeight))
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    pinchStart.current = null
    const remaining = Array.from(pointers.current.values())
    dragLast.current = remaining.length === 1 ? remaining[0] : null
  }

  const handleCancelCrop = () => {
    setImgEl(null)
    setObjectUrl(null)
    setUploadError(null)
    setMode(ogImageUrl ? 'saved' : 'empty')
  }

  const handleConfirmCrop = async () => {
    if (!imgEl || frameSize.w === 0) return
    setUploadError(null)
    setMode('uploading')
    setUploadPct(10)

    try {
      const scale = minScaleFor(frameSize, imgEl.naturalWidth, imgEl.naturalHeight) * zoom
      const srcX = -pan.x / scale
      const srcY = -pan.y / scale
      const srcW = frameSize.w / scale
      const srcH = frameSize.h / scale

      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 630
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported')
      ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, 1200, 630)

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88))
      if (!blob) throw new Error('Could not process image')
      setUploadPct(25)

      const signedRes = await fetch('/api/og-image', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding.id }),
      })
      if (!signedRes.ok) throw new Error('Could not get upload URL')
      const { signedUrl, publicUrl } = await signedRes.json()
      setUploadPct(55)

      const putRes = await fetch(signedUrl, {
        method:  'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body:    blob,
      })
      if (!putRes.ok) throw new Error('Upload failed')
      setUploadPct(85)

      const patchRes = await fetch('/api/admin/wedding', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding.id, config: { og_image_url: publicUrl } }),
      })
      if (!patchRes.ok) throw new Error('Could not save photo')
      const data = await patchRes.json()
      setUploadPct(100)

      setImgEl(null)
      setObjectUrl(null)
      setMode('saved')
      onUpdated(data.wedding)
    } catch {
      setUploadError('Upload failed. Check your connection and try again.')
      setMode('crop')
    }
  }

  const handleConfirmRemove = async () => {
    setRemoving(true)
    setRemoveError(null)
    try {
      const res = await fetch('/api/og-image', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding.id }),
      })
      if (!res.ok) throw new Error('Failed to remove photo')
      const data = await res.json()
      setConfirmingRemove(false)
      setMode('empty')
      onUpdated(data.wedding)
    } catch {
      setRemoveError('Could not remove photo. Please try again.')
    } finally {
      setRemoving(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelected(file)
  }

  const minScale       = imgEl && frameSize.w > 0 ? minScaleFor(frameSize, imgEl.naturalWidth, imgEl.naturalHeight) : 1
  const effectiveScale = minScale * zoom
  const zoomPct         = ((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFileSelected(file)
          e.target.value = ''
        }}
      />

      {mode === 'empty' && (
        <div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload share preview photo"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`rounded-2xl p-8 text-center cursor-pointer transition-all border border-dashed ${
              dragOver
                ? 'border-[rgba(201,168,76,0.5)] bg-[rgba(201,168,76,0.05)]'
                : 'border-[rgba(255,255,255,0.10)] hover:border-[rgba(201,168,76,0.3)]'
            }`}
          >
            <p className="font-body text-sm text-ivory/45">Click to upload or drag &amp; drop</p>
            <p className="font-body text-xs text-ivory/20 mt-1">
              JPEG, PNG, or WebP — max 8 MB. Recommended 1200×630 or wider.
            </p>
          </div>
          {pickError && <p className="text-xs text-red-400 mt-2">{pickError}</p>}
        </div>
      )}

      {(mode === 'crop' || mode === 'uploading') && imgEl && (
        <div className="space-y-3">
          <div
            ref={frameRef}
            className={`relative w-full max-w-[480px] mx-auto aspect-[1200/630] rounded-lg overflow-hidden ${
              mode === 'uploading' ? 'opacity-60 pointer-events-none' : ''
            }`}
            style={{ border: '1px solid rgba(201,168,76,0.3)' }}
          >
            <div
              aria-label="Drag to reposition photo"
              className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {objectUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={objectUrl}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: imgEl.naturalWidth,
                    height: imgEl.naturalHeight,
                    maxWidth: 'none',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${effectiveScale})`,
                    transformOrigin: 'top left',
                  }}
                />
              )}
            </div>

            {/* Corner-bracket viewfinder cue — the image always fills the frame
                edge-to-edge by construction, so there's no dimmed outside mask. */}
            <div style={{ position: 'absolute', top: 8, left: 8, width: 16, height: 16, borderTop: '2px solid rgba(201,168,76,0.6)', borderLeft: '2px solid rgba(201,168,76,0.6)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderTop: '2px solid rgba(201,168,76,0.6)', borderRight: '2px solid rgba(201,168,76,0.6)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 8, left: 8, width: 16, height: 16, borderBottom: '2px solid rgba(201,168,76,0.6)', borderLeft: '2px solid rgba(201,168,76,0.6)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 8, right: 8, width: 16, height: 16, borderBottom: '2px solid rgba(201,168,76,0.6)', borderRight: '2px solid rgba(201,168,76,0.6)', pointerEvents: 'none' }} />
          </div>

          {mode === 'crop' && (
            <>
              <div>
                <label htmlFor="og-zoom" className="rsvp-label">Zoom</label>
                <input
                  id="og-zoom"
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={e => applyZoom(Number(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer accent-emerald-light"
                  style={{
                    background: `linear-gradient(to right, rgba(12,168,110,0.6) ${zoomPct}%, rgba(255,255,255,0.1) ${zoomPct}%)`,
                  }}
                />
              </div>

              <p className="text-[11px] text-ivory/25 text-center">Drag to reposition · Pinch or scroll to zoom</p>

              {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="border border-white/10 text-ivory/50 hover:text-ivory/80 hover:border-white/20 rounded-full px-5 py-2 text-xs tracking-wider uppercase transition-colors flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCrop}
                  className="btn-gold px-6 py-2.5 text-xs flex-1"
                >
                  Use This Photo
                </button>
              </div>
            </>
          )}

          {mode === 'uploading' && (
            <>
              <div className="h-1.5 rounded-full overflow-hidden max-w-[480px] mx-auto bg-white/5">
                <motion.div
                  animate={{ width: `${uploadPct}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #C9A84C, #E8CC7A)' }}
                />
              </div>
              <p className="text-xs text-ivory/40 tracking-wider text-center">Uploading…</p>
            </>
          )}
        </div>
      )}

      {mode === 'saved' && ogImageUrl && (
        <div className="space-y-5">
          <div>
            <label className="rsvp-label">Current Photo</label>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogImageUrl}
              alt="Current share preview photo"
              className="w-full aspect-[1200/630] object-cover rounded-xl border border-white/10"
            />
          </div>

          <div>
            <label className="rsvp-label">What Guests Will See</label>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/og?slug=${wedding.slug}&name=${encodeURIComponent(wedding.couple_names.name1)}&_=${Date.now()}`}
              alt="Preview of your invitation link when shared"
              className="w-full aspect-[1200/630] object-cover rounded-xl border border-[rgba(201,168,76,0.2)]"
            />
            <p className="text-[11px] text-ivory/20 mt-2">
              This is a live preview. WhatsApp and iMessage cache link previews, so shared links may take time to reflect a new photo.
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outline-gold flex-1">
              Replace Photo
            </button>
            <button
              type="button"
              onClick={() => { setConfirmingRemove(v => !v); setRemoveError(null) }}
              className="text-xs text-ivory/30 hover:text-red-400 transition-colors"
            >
              Remove Photo
            </button>
          </div>

          {confirmingRemove && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3">
              <p className="text-xs text-red-400 leading-relaxed mb-3">
                Remove your share preview photo? Guests will see the default template the next time link previews refresh.
              </p>
              {removeError && <p className="text-xs text-red-400 mb-2">{removeError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(false)}
                  className="border border-white/10 text-ivory/50 hover:text-ivory/80 hover:border-white/20 rounded-full px-5 py-2 text-xs tracking-wider uppercase transition-colors flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  disabled={removing}
                  className="border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 rounded-full px-5 py-2 text-xs tracking-wider uppercase transition-colors flex-1 disabled:opacity-50"
                >
                  {removing ? 'Removing…' : 'Confirm Remove'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
