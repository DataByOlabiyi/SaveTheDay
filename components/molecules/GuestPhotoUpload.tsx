'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GoldDivider } from '@/components/atoms/GoldText'

interface GuestPhotoUploadProps {
  weddingId: string
  guestId:   string
  guestName: string
}

export function GuestPhotoUpload({ weddingId, guestId, guestName }: GuestPhotoUploadProps) {
  const fileRef                 = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [count, setCount]         = useState(0)
  const [error, setError]         = useState('')

  const firstName = guestName.split(' ')[0]

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const form = new FormData()
    form.append('file', file)
    form.append('weddingId', weddingId)
    form.append('guestId', guestId)

    try {
      const res = await fetch('/api/gallery/guest-upload', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Upload failed. Please try again.')
      } else {
        setCount(c => c + 1)
      }
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
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
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
          aria-label="Choose a photo to share"
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
              Choose a photo
            </>
          )}
        </button>

        <AnimatePresence>
          {count > 0 && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 font-body text-xs tracking-wide"
              style={{ color: 'rgba(12, 168, 110, 0.7)' }}
            >
              ✓ {count === 1 ? 'Photo shared' : `${count} photos shared`} — thank you
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
