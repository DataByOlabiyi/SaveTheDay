import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from 'sonner'
import { WebVitals } from '@/components/atoms/WebVitals'
import './globals.css'

// ──────────────────────────────────────────────────────────────
// Fonts are loaded via CSS @import in globals.css
// This avoids build-time network dependency and works offline
// ──────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────
// Default Metadata (overridden per-page for personalization)
// ──────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: 'Save The Day — Luxury Digital Invitations',
    template: '%s | Save The Day',
  },
  description: 'A personal message, just for you. Tap to open.',
  keywords: ['wedding invitation', 'save the date', 'digital invitation', 'Nigerian wedding'],
  authors: [{ name: 'Save The Day' }],
  creator: 'Save The Day',
  applicationName: 'Save The Day',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: 'Save The Day',
  },
  twitter: {
    card: 'summary_large_image',
  },
  // ── PWA manifest ──────────────────────────────────────────────
  manifest: '/manifest.json',
  // ── Icons ─────────────────────────────────────────────────────
  icons: {
    // Standard favicon
    icon: [
      { url: '/icons/favicon-16.png', sizes: '16x16',  type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32',  type: 'image/png' },
      { url: '/icons/favicon-48.png', sizes: '48x48',  type: 'image/png' },
      { url: '/icons/icon-192.png',   sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png',   sizes: '512x512', type: 'image/png' },
    ],
    // Apple home screen icon
    apple: [
      { url: '/icons/apple-touch-icon-120.png', sizes: '120x120', type: 'image/png' },
      { url: '/icons/apple-touch-icon-152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/apple-touch-icon-167.png', sizes: '167x167', type: 'image/png' },
      { url: '/icons/apple-touch-icon.png',     sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // Respect notch/safe areas (iPhone X+)
  themeColor: [
    // Match system preference — dark (default brand) / light
    { media: '(prefers-color-scheme: dark)',  color: '#080C0A' },
    { media: '(prefers-color-scheme: light)', color: '#0CA86E' },
  ],
}

// ──────────────────────────────────────────────────────────────
// Root Layout
// ──────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to external resources for speed */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" />

        {/* ── PWA / iOS home screen tweaks ──────────────────────── */}
        {/* Removes Safari chrome when launched from home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Save The Day" />

        {/* Mobile Web App for older Android/Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Windows tile (Edge / Windows "Pin to Start") */}
        <meta name="msapplication-TileColor" content="#080C0A" />
        <meta name="msapplication-TileImage" content="/icons/icon-144.png" />
        <meta name="msapplication-config" content="none" />

        {/* Prevent iOS auto-link detection on invitation text */}
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
      </head>
      <body className="bg-obsidian text-ivory antialiased">
        {children}
        {/* Toast notifications for RSVP feedback */}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1A1A1C',
              border: '1px solid rgba(201, 168, 76, 0.2)',
              color: '#FAF7F0',
              fontFamily: 'var(--font-jost)',
              fontSize: '0.875rem',
              letterSpacing: '0.02em',
            },
          }}
        />
        <Analytics />
        <WebVitals />
      </body>
    </html>
  )
}
