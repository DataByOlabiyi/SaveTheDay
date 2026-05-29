
const withPWA = require('@ducanh2912/next-pwa').default

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // picsum.photos — used for demo gallery photos in development
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        pathname: '/**',
      },
      // QR code service
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Compress responses
  compress: true,
  // Power headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      // Long cache for static assets
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Service worker — must NOT be cached (browsers handle SW versioning)
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      // Manifest — short cache so icon/name updates propagate quickly
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
}

module.exports = withPWA({
  // ── PWA Configuration ───────────────────────────────────────────
  dest: 'public',                          // Output sw.js + workbox files to /public
  disable: process.env.NODE_ENV === 'development', // Skip SW in dev (hot-reload conflicts)
  register: true,                          // Auto-register SW via next-pwa script
  skipWaiting: true,                       // Activate new SW immediately (no waiting tab)
  reloadOnOnline: true,                    // Reload cached page when connectivity returns
  cacheOnFrontEndNav: true,                // Cache pages visited via client-side navigation
  aggressiveFrontEndNavCaching: false,     // Don't cache every nav — keep invites fresh
  // Offline fallback — shown for any uncached document request
  fallbacks: {
    document: '/offline',
  },
  // ── Workbox Runtime Caching ─────────────────────────────────────
  workboxOptions: {
    // Next.js built output + third-party scripts
    runtimeCaching: [
      // ── Google Fonts stylesheets ──────────────────────────────
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-stylesheets',
          expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Google Fonts files ────────────────────────────────────
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-webfonts',
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Cloudinary images ─────────────────────────────────────
      {
        urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'cloudinary-images',
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Supabase storage images ───────────────────────────────
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'supabase-storage',
          expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Next.js static assets (_next/static) ─────────────────
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Next.js image optimisation ────────────────────────────
      {
        urlPattern: /\/_next\/image\?.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'next-image',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── API routes — Network first, fall back to cache ────────
      // Keeps RSVP, analytics, guestbook always fresh
      {
        urlPattern: /\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-routes',
          networkTimeoutSeconds: 10,
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // ── Wedding & guest pages — Stale-while-revalidate ────────
      // Guests can open their invite offline after first visit
      {
        urlPattern: /^https?:\/\/.*\/[^/]+\/[^/]+$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'invitation-pages',
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})(nextConfig)
