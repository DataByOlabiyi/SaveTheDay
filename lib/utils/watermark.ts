import type { GalleryPhoto } from '@/lib/db/types'

/**
 * Loads a photo, stamps a semi-transparent text watermark in the bottom-right
 * corner, and returns the result as a JPEG Blob ready for download.
 *
 * Uses the Canvas API — call only in browser ('use client') contexts.
 * Requires the Supabase storage bucket to send CORS headers (public buckets do).
 */
export function applyWatermark(photo: GalleryPhoto, text: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not available')); return }

      ctx.drawImage(img, 0, 0)

      const fontSize = Math.max(14, Math.floor(img.naturalWidth * 0.022))
      ctx.font         = `${fontSize}px Georgia, "Times New Roman", serif`
      ctx.textAlign    = 'right'
      ctx.textBaseline = 'bottom'

      // Drop-shadow so the text is legible on both light and dark photos
      ctx.shadowColor   = 'rgba(0,0,0,0.55)'
      ctx.shadowBlur    = 6
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1

      ctx.fillStyle = 'rgba(255,255,255,0.60)'

      const pad = Math.floor(fontSize * 0.9)
      ctx.fillText(text, img.naturalWidth - pad, img.naturalHeight - pad)

      canvas.toBlob(
        blob => { blob ? resolve(blob) : reject(new Error('Canvas export failed')) },
        'image/jpeg',
        0.92,
      )
    }

    img.onerror = () => reject(new Error('Image failed to load for watermarking'))
    img.src = photo.url
  })
}
