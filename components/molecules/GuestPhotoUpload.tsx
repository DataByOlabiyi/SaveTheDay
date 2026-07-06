'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GoldDivider } from '@/components/atoms/GoldText'

interface GuestPhotoUploadProps {
  weddingId: string
  guestId:   string
  guestName: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

type UploadStatus = 'pending' | 'uploading' | 'succeeded' | 'failed'

interface UploadItem {
  id:     string
  file:   File
  status: UploadStatus
  error?: string
}

function StatusGlyph({ status }: { status: UploadStatus }) {
  if (status === 'pending') {
    return (
      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full border border-white/15" />
      </div>
    )
  }

  if (status === 'uploading') {
    return (
      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-3 h-3 border border-gold/40 border-t-gold rounded-full"
        />
      </div>
    )
  }

  if (status === 'succeeded') {
    return (
      <div className="w-4 h-4 shrink-0 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(12,168,110,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    )
  }

  return (
    <div className="w-4 h-4 shrink-0 flex items-center justify-center">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-red-400/70" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  )
}

export function GuestPhotoUpload({ weddingId, guestId, guestName }: GuestPhotoUploadProps) {
  const fileRef            = useRef<HTMLInputElement>(null)
  const [items, setItems]  = useState<UploadItem[]>([])
  const [error, setError]  = useState('')

  const firstName    = guestName.split(' ')[0]
  const uploading     = items.some(i => i.status === 'pending' || i.status === 'uploading')
  const successCount  = items.filter(i => i.status === 'succeeded').length

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)))
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setError('')

    const batch: UploadItem[] = Array.from(files).map(file => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      if (file.size > MAX_FILE_SIZE) {
        return { id, file, status: 'failed', error: 'File is too large — max 10 MB' }
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { id, file, status: 'failed', error: 'Unsupported format — use JPEG, PNG, WebP or GIF' }
      }
      return { id, file, status: 'pending' }
    })

    setItems(prev => [...prev, ...batch])

    try {
      for (const item of batch) {
        if (item.status !== 'pending') continue

        updateItem(item.id, { status: 'uploading' })

        const form = new FormData()
        form.append('file', item.file)
        form.append('weddingId', weddingId)
        form.append('guestId', guestId)

        const res = await fetch('/api/gallery/guest-upload', { method: 'POST', body: form })

        if (res.ok) {
          updateItem(item.id, { status: 'succeeded' })
        } else if (res.status === 429) {
          updateItem(item.id, { status: 'failed', error: 'Too many uploads — please wait a moment.' })
          const batchIds = new Set(batch.map(b => b.id))
          setItems(prev => prev.map(i =>
            batchIds.has(i.id) && i.status === 'pending'
              ? { ...i, status: 'failed', error: 'Skipped — rate limit reached' }
              : i
          ))
          break
        } else {
          const data = await res.json().catch(() => null)
          updateItem(item.id, { status: 'failed', error: data?.error ?? 'Upload failed. Please try again.' })
        }
      }
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <motion.section
      id="section-upload"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8 }}
      className="py-20 px-6"
      aria-label="Share a photo"
    >
      <div className="px-6 mb-10"><GoldDivider wide /></div>
      <div className="max-w-sm mx-auto text-center">
        <p
          className="font-body tracking-[0.3em] uppercase mb-3"
          style={{ fontSize: '0.65rem', color: 'rgba(12, 168, 110, 0.5)' }}
        >
          Share a moment
        </p>

        <p
          className="font-display text-ivory/70 mb-2"
          style={{ fontSize: 'clamp(1.125rem, 3vw, 1.5rem)', fontWeight: 300, fontStyle: 'italic' }}
        >
          {firstName}, share a photo
        </p>
        <p className="font-body text-ivory/30 text-xs leading-relaxed mb-8">
          Your photo goes straight to the couple&apos;s gallery.
        </p>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFile}
          aria-label="Choose photos to share"
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-gold/30 disabled:opacity-50 disabled:cursor-not-allowed text-ivory/50 hover:text-ivory/80 font-body text-xs tracking-widest uppercase px-8 py-3 transition-all rounded-sm"
        >
          {uploading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-3 h-3 border border-gold/40 border-t-gold rounded-full shrink-0"
              />
              Uploading...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose photos
            </>
          )}
        </button>

        <AnimatePresence>
          {items.length > 0 && (
            <div className="mt-5 space-y-2 text-left">
              {items.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 py-1"
                >
                  <StatusGlyph status={item.status} />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <p className="font-body text-xs text-ivory/50 truncate">{item.file.name}</p>
                    {item.status === 'failed' && item.error && (
                      <p className="font-body text-[10.5px] text-red-400/60 leading-snug">{item.error}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {successCount > 0 && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 font-body text-xs tracking-wide"
              style={{ color: 'rgba(12, 168, 110, 0.7)' }}
            >
              ✓ {successCount === 1 ? 'Photo shared' : `${successCount} photos shared`} — thank you
            </motion.p>
          )}
        </AnimatePresence>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 font-body text-red-400/70 text-xs"
          >
            {error}
          </motion.p>
        )}
      </div>
    </motion.section>
  )
}
