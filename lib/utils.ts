import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Cloudinary URL builder with transformations */
export function cloudinaryUrl(
  publicId: string,
  transformations: {
    width?: number
    height?: number
    quality?: string | number
    format?: string
    crop?: string
  } = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) return publicId // Fallback to raw URL

  const { width, height, quality = 'auto', format = 'auto', crop = 'fill' } = transformations

  const parts = ['f_' + format, 'q_' + quality]
  if (width) parts.push('w_' + width)
  if (height) parts.push('h_' + height)
  if (width && height) parts.push('c_' + crop)

  return `https://res.cloudinary.com/${cloudName}/image/upload/${parts.join(',')}/${publicId}`
}

/** Format a number for display (pad with zero) */
export function padZero(n: number): string {
  return String(n).padStart(2, '0')
}

/** Check if we're on a touch device */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// ──────────────────────────────────────────────────────────────
// Calendar helpers
// ──────────────────────────────────────────────────────────────

export interface CalendarEventParams {
  title: string
  /** ISO date string, e.g. "2026-08-22T00:00:00.000Z" */
  startDate: string
  location: string
  description: string
  /**
   * Wedding ceremony start time as "HH:MM" in the local timezone.
   * When omitted the event is created as an all-day entry — no
   * timezone conversions needed and no wrong-time-on-different-device issues.
   */
  startTime?: string
  /**
   * Wedding ceremony end time as "HH:MM" in the local timezone.
   * Defaults to startTime + 8 hours (typical Nigerian wedding).
   */
  endTime?: string
  /**
   * UTC offset of the wedding city in hours (positive = east of UTC).
   * Nigeria / WAT is +1 year-round (no DST).
   * @default 1
   */
  utcOffsetHours?: number
}

/**
 * Parse "HH:MM" into { hours, minutes }.
 */
function parseTime(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(':').map(Number)
  return { hours: h ?? 0, minutes: m ?? 0 }
}

/**
 * Given a date string and a local "HH:MM" time, return a UTC Date object.
 * e.g. "2026-08-22", "14:00", utcOffset=1  →  Date(2026-08-22T13:00:00Z)
 */
function toUTC(isoDateStr: string, localTime: string, utcOffsetHours: number): Date {
  // Strip to YYYY-MM-DD regardless of whether it arrived with a time component
  const datePart = isoDateStr.slice(0, 10)
  const { hours, minutes } = parseTime(localTime)
  // Build a UTC date by subtracting the offset
  const d = new Date(`${datePart}T00:00:00Z`)
  d.setUTCHours(hours - utcOffsetHours, minutes, 0, 0)
  return d
}

/** Format a Date as compact UTC string: "20260822T130000Z" */
function fmtUTC(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')
}

/** Format a Date as compact local date: "20260822" (for all-day events) */
function fmtDate(isoDateStr: string): string {
  return isoDateStr.slice(0, 10).replace(/-/g, '')
}

/** Next calendar day string "YYYYMMDD" (all-day end is exclusive) */
function fmtNextDay(isoDateStr: string): string {
  const d = new Date(isoDateStr.slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return fmtDate(d.toISOString())
}

/**
 * Generate a valid RFC 5545 iCalendar (.ics) string.
 *
 * - If startTime is supplied → timed event stored as UTC (correct across timezones)
 * - If startTime is omitted  → all-day event (VALUE=DATE) — safe for any timezone
 */
export function generateICS(params: CalendarEventParams): string {
  const {
    title,
    startDate,
    location,
    description,
    startTime,
    endTime,
    utcOffsetHours = 1, // Nigeria WAT = UTC+1
  } = params

  // Sanitise text fields per RFC 5545 (escape commas, semicolons, backslashes, newlines)
  const esc = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

  let dtStart: string
  let dtEnd: string

  if (startTime) {
    const start = toUTC(startDate, startTime, utcOffsetHours)

    // Compute end: use endTime if given, else start + 8 h (typical Nigerian wedding)
    let end: Date
    if (endTime) {
      end = toUTC(startDate, endTime, utcOffsetHours)
      // Handle midnight wrap — if end <= start, assume next day
      if (end <= start) end.setUTCDate(end.getUTCDate() + 1)
    } else {
      end = new Date(start.getTime() + 8 * 60 * 60 * 1000)
    }

    dtStart = `DTSTART:${fmtUTC(start)}`
    dtEnd   = `DTEND:${fmtUTC(end)}`
  } else {
    // All-day — no timezone ambiguity
    dtStart = `DTSTART;VALUE=DATE:${fmtDate(startDate)}`
    dtEnd   = `DTEND;VALUE=DATE:${fmtNextDay(startDate)}`
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//Save The Day//EN',
    'BEGIN:VEVENT',
    dtStart,
    dtEnd,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(description)}`,
    'STATUS:CONFIRMED',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@savetheday`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * Build a Google Calendar "add event" URL.
 * Opens directly in the Google Calendar web app or the Android app.
 */
export function buildGoogleCalendarUrl(params: CalendarEventParams): string {
  const {
    title,
    startDate,
    location,
    description,
    startTime,
    endTime,
    utcOffsetHours = 1,
  } = params

  let dates: string
  if (startTime) {
    const start = toUTC(startDate, startTime, utcOffsetHours)
    let end: Date
    if (endTime) {
      end = toUTC(startDate, endTime, utcOffsetHours)
      if (end <= start) end.setUTCDate(end.getUTCDate() + 1)
    } else {
      end = new Date(start.getTime() + 8 * 60 * 60 * 1000)
    }
    dates = `${fmtUTC(start)}/${fmtUTC(end)}`
  } else {
    // All-day format for Google: YYYYMMDD/YYYYMMDD
    dates = `${fmtDate(startDate)}/${fmtNextDay(startDate)}`
  }

  const p = new URLSearchParams({
    action:   'TEMPLATE',
    text:     title,
    dates,
    details:  description,
    location,
    sf:       'true',
    output:   'xml',
  })

  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

/**
 * Build an Outlook Web "add event" URL (works on all platforms via browser).
 */
export function buildOutlookUrl(params: CalendarEventParams): string {
  const {
    title,
    startDate,
    location,
    description,
    startTime,
    endTime,
    utcOffsetHours = 1,
  } = params

  const base = 'https://outlook.live.com/calendar/0/deeplink/compose'

  const p = new URLSearchParams({
    path:     '/calendar/action/compose',
    rru:      'addevent',
    subject:  title,
    body:     description,
    location,
  })

  if (startTime) {
    const start = toUTC(startDate, startTime, utcOffsetHours)
    let end: Date
    if (endTime) {
      end = toUTC(startDate, endTime, utcOffsetHours)
      if (end <= start) end.setUTCDate(end.getUTCDate() + 1)
    } else {
      end = new Date(start.getTime() + 8 * 60 * 60 * 1000)
    }
    p.set('startdt', start.toISOString())
    p.set('enddt',   end.toISOString())
  } else {
    p.set('startdt', startDate.slice(0, 10))
    p.set('enddt',   new Date(
      new Date(startDate.slice(0, 10) + 'T00:00:00Z').getTime() + 24 * 60 * 60 * 1000
    ).toISOString().slice(0, 10))
    p.set('allday', 'true')
  }

  return `${base}?${p.toString()}`
}

/** Download a file blob */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
