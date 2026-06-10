export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
      console.warn('[Sentry] NEXT_PUBLIC_SENTRY_DSN is not set — errors will not be captured in production.')
    }
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
