import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // Only send errors in production — not during dev
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
  // Capture replays on error (1% of sessions, 100% on error)
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,  // Mask guest names / personal data in replays
      blockAllMedia: true,
    }),
  ],
})
