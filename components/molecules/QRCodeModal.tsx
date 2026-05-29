'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface QRCodeModalProps {
  url:         string
  title?:      string
  subtitle?:   string
  onClose:     () => void
  /** If provided, shows a WhatsApp share button */
  whatsappText?: string
  /** If provided, shows an email share button */
  emailSubject?: string
  emailBody?:    string
}

export function QRCodeModal({
  url, title, subtitle, onClose, whatsappText, emailSubject, emailBody,
}: QRCodeModalProps) {
  const [copied, setCopied]         = useState(false)
  const [qrError, setQrError]       = useState(false)
  const [downloading, setDownloading] = useState(false)

  // QR code via free public API — no npm dependency needed
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=16&color=0CA86E&bgcolor=080C0A&data=${encodeURIComponent(url)}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const downloadQR = async () => {
    setDownloading(true)
    try {
      const response = await fetch(qrApiUrl)
      const blob     = await response.blob()
      const a        = document.createElement('a')
      a.href         = URL.createObjectURL(blob)
      a.download     = 'wedding-qr-code.png'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch {
      // silent fail
    } finally {
      setDownloading(false)
    }
  }

  const shareWhatsApp  = () => {
    const text = whatsappText ?? `${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareInstagram = () => {
    // Instagram doesn't support direct URL sharing — copy link and prompt
    copyLink()
    alert('Link copied! Open Instagram and paste it in your bio or stories.')
  }

  const shareEmail = () => {
    const subject = encodeURIComponent(emailSubject ?? 'You\'re invited!')
    const body    = encodeURIComponent(`${emailBody ?? ''}\n\n${url}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share QR Code"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-xl p-8 max-w-sm w-full text-center"
        style={{
          background: '#0B140F',
          border: '1px solid rgba(12,168,110,0.2)',
          boxShadow: '0 0 60px rgba(12,168,110,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-ivory/40 hover:text-ivory transition-colors"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {title && (
          <p className="font-body text-xs tracking-[0.25em] uppercase text-emerald-DEFAULT/60 mb-1">
            {title}
          </p>
        )}
        {subtitle && (
          <p className="font-display text-ivory/70 mb-6 italic" style={{ fontSize: '1rem', fontWeight: 300 }}>
            {subtitle}
          </p>
        )}

        {/* QR Code */}
        <div
          className="mx-auto mb-6 rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            width: 180, height: 180,
            background: '#080C0A',
            border: '1px solid rgba(12,168,110,0.15)',
          }}
        >
          {!qrError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrApiUrl}
              alt="QR Code for wedding invitation link"
              width={160}
              height={160}
              onError={() => setQrError(true)}
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <p className="text-ivory/25 text-xs text-center px-4">
              QR code unavailable offline
            </p>
          )}
        </div>

        {/* URL chip */}
        <div
          className="flex items-center gap-2 rounded px-3 py-2 mb-6 text-left"
          style={{ background: 'rgba(12,168,110,0.05)', border: '1px solid rgba(12,168,110,0.12)' }}
        >
          <p className="flex-1 font-body text-ivory/40 text-xs truncate">{url}</p>
          <button
            onClick={copyLink}
            className="flex-shrink-0 text-xs text-emerald-DEFAULT/70 hover:text-emerald-DEFAULT transition-colors font-body tracking-wider"
            aria-label="Copy invitation link"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  ✓ Copied
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Copy
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={shareWhatsApp}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded text-xs font-body tracking-wider uppercase transition-colors"
            style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', color: '#25D366' }}
            aria-label="Share via WhatsApp"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.118.553 4.107 1.521 5.84L0 24l6.335-1.521A11.933 11.933 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.52-5.18-1.427l-.37-.222-3.833.92.937-3.722-.242-.383C3.1 15.73 2 13.985 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            WhatsApp
          </button>
          <button
            onClick={shareEmail}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded text-xs font-body tracking-wider uppercase transition-colors"
            style={{ background: 'rgba(12,168,110,0.06)', border: '1px solid rgba(12,168,110,0.2)', color: '#3DD9A0' }}
            aria-label="Share via email"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Email
          </button>
        </div>

        {/* Download QR */}
        <button
          onClick={downloadQR}
          disabled={downloading || qrError}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-body tracking-wider uppercase transition-opacity disabled:opacity-40"
          style={{ background: 'rgba(12,168,110,0.04)', border: '1px solid rgba(12,168,110,0.1)', color: 'rgba(250,247,242,0.4)' }}
          aria-label="Download QR code image"
        >
          {downloading ? (
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          )}
          Download QR Code
        </button>
      </motion.div>
    </motion.div>
  )
}
