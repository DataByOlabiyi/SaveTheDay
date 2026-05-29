'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Events } from '@/lib/analytics/events'

interface ShareableCardProps {
  weddingSlug: string
  guestName?: string
  status: 'attending' | 'declined'
  weddingId: string
  guestId?: string
  coupleName1: string
  coupleName2: string
}

export function ShareableCard({
  weddingSlug,
  guestName,
  status,
  weddingId,
  guestId,
  coupleName1,
  coupleName2,
}: ShareableCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded]   = useState(false)

  const cardUrl =
    `/api/share-card?slug=${encodeURIComponent(weddingSlug)}` +
    (guestName ? `&name=${encodeURIComponent(guestName)}` : '') +
    `&status=${status}`

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res  = await fetch(cardUrl)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${coupleName1.toLowerCase()}-${coupleName2.toLowerCase()}-card.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDownloaded(true)
      Events.shared(weddingId, guestId, 'card_download')
    } catch {
      // Fallback: open in new tab so the user can long-press save on mobile
      window.open(cardUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  const handleShareWhatsApp = () => {
    // On mobile WhatsApp doesn't accept file blobs, so share the card URL
    const appUrl    = typeof window !== 'undefined' ? window.location.origin : ''
    const firstName = guestName?.split(' ')[0]
    const text      = status === 'attending'
      ? `${firstName ? `I'll be celebrating with ` : `We'll be celebrating with `}${coupleName1} & ${coupleName2}! 🥂\n\n${appUrl}/${weddingSlug}`
      : `Sending love to ${coupleName1} & ${coupleName2} on their special day 💚\n\n${appUrl}/${weddingSlug}`

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    Events.shared(weddingId, guestId, 'whatsapp_card')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      {/* Preview thumbnail */}
      <div
        className="w-full aspect-square rounded-sm overflow-hidden mb-4"
        style={{
          border: '1px solid rgba(12, 168, 110, 0.15)',
          background: 'rgba(12, 168, 110, 0.03)',
          maxWidth: 240,
          margin: '0 auto 1rem',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardUrl}
          alt="Your shareable card"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full btn-gold py-3.5 flex items-center justify-center gap-2"
      >
        {downloading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Preparing…
          </>
        ) : downloaded ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved to device
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Save Your Card
          </>
        )}
      </button>

      {/* WhatsApp share */}
      <button
        onClick={handleShareWhatsApp}
        className="w-full btn-outline-gold py-3 flex items-center justify-center gap-2 text-xs"
      >
        <WhatsAppIcon />
        Share to WhatsApp
      </button>
    </motion.div>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
