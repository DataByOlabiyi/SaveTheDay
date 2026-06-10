'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals(metric => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(`[CWV] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`)
    }

    // In production, beacon to /api/vitals if you add that route later.
    // For now Vercel Analytics already collects CWV automatically.
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_VITALS_ENDPOINT) {
      navigator.sendBeacon(
        process.env.NEXT_PUBLIC_VITALS_ENDPOINT,
        JSON.stringify({ name: metric.name, value: metric.value, rating: metric.rating, id: metric.id })
      )
    }
  })

  return null
}
