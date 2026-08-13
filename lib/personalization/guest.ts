// ──────────────────────────────────────────────────────────────
// Guest Personalization Utilities
// ──────────────────────────────────────────────────────────────

/**
 * Convert a guest name to a URL-safe slug
 * "Adaeze Okonkwo" → "adaeze-okonkwo"
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Collapse multiple hyphens
}

/**
 * Get first name from full name for casual greetings
 * "Adaeze Okonkwo" → "Adaeze"
 */
export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0]
}

/**
 * Generate personalized greeting copy based on guest data
 */
export function getPersonalGreeting(
  guestName: string,
  coupleName1: string,
  coupleName2: string
): { main: string; sub: string } {
  const firstName = getFirstName(guestName)

  return {
    main: `${firstName}, you're invited.`,
    sub: `${coupleName1} & ${coupleName2} can't imagine this day without you.`,
  }
}

/**
 * Generate the shareable WhatsApp message for a guest
 */
export function getShareMessage(
  coupleName1: string,
  coupleName2: string,
  weddingDate: string,
  appUrl: string,
  weddingSlug: string
): string {
  const date = new Date(weddingDate)
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const url = `${appUrl}/${weddingSlug}`

  return encodeURIComponent(
    `🥂 I just got the most beautiful wedding invitation I've ever seen!\n\n` +
    `${coupleName1} & ${coupleName2} are getting married on ${formattedDate}.\n\n` +
    `Open this — it's not your average invite: ${url}`
  )
}

/**
 * Build the OG (Open Graph) metadata for a wedding
 * This is what shows when the link is previewed on WhatsApp/iMessage
 */
export function buildOGMetadata(params: {
  coupleName1: string
  coupleName2: string
  guestName?: string
  appUrl: string
  weddingSlug: string
  // The canonical path for the exact page being rendered (e.g. `/e/${slug}` or
  // `/e/${slug}/${guestSlug}`). Meta's crawler (which WhatsApp shares) uses og:url
  // as a cache key — every guest link declaring the same og:url would collapse
  // onto one shared cached preview instead of each guest getting their own.
  path: string
}) {
  const { coupleName1, coupleName2, guestName, appUrl, weddingSlug, path } = params
  const ogImageUrl = `${appUrl}/api/og?slug=${weddingSlug}${guestName ? `&name=${encodeURIComponent(guestName)}` : ''}`

  return {
    title: guestName
      ? `${guestName.split(' ')[0]}, ${coupleName1} & ${coupleName2} have something for you 🔒`
      : `${coupleName1} & ${coupleName2} have something for you 🔒`,
    description: 'A personal message, just for you. Tap to open.',
    image: ogImageUrl,
    url: `${appUrl}${path}`,
  }
}

/**
 * Calculate countdown from now to wedding date
 */
export function getCountdown(weddingDate: string): {
  days: number
  hours: number
  minutes: number
  seconds: number
  isPast: boolean
} {
  const now = Date.now()
  const target = new Date(weddingDate).getTime()
  const diff = target - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, isPast: false }
}

/**
 * Format wedding date beautifully
 * "The fourteenth of February, Two Thousand and Twenty-Six"
 */
export function formatWeddingDate(dateString: string): {
  day: string
  month: string
  year: string
  full: string
  numeric: string
} {
  const date = new Date(dateString)

  return {
    day: date.toLocaleDateString('en-GB', { day: 'numeric' }),
    month: date.toLocaleDateString('en-GB', { month: 'long' }),
    year: date.getFullYear().toString(),
    full: date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    numeric: date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  }
}
