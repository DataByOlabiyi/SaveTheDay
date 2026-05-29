// ──────────────────────────────────────────────────────────────
// Client-side Analytics — thin wrapper over fetch + Vercel Analytics
// ──────────────────────────────────────────────────────────────

import type { AnalyticsEventType } from '@/lib/db/types'

interface TrackPayload {
  weddingId: string
  guestId?: string
  eventType: AnalyticsEventType
  metadata?: Record<string, unknown>
}

/**
 * Track an event — hits our API route which writes to Supabase.
 * Fire-and-forget: we never await this in critical paths.
 */
export async function track(payload: TrackPayload): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // Analytics failure must never break the user experience
  }
}

/**
 * Convenience helpers for specific events
 */
export const Events = {
  opened: (weddingId: string, guestId?: string) =>
    track({ weddingId, guestId, eventType: 'opened' }),

  sealTapped: (weddingId: string, guestId?: string) =>
    track({ weddingId, guestId, eventType: 'seal_tapped' }),

  videoWatched: (weddingId: string, guestId?: string, pct?: number) =>
    track({ weddingId, guestId, eventType: 'video_watched', metadata: { completion_pct: pct } }),

  rsvpSubmitted: (weddingId: string, guestId: string, status: string) =>
    track({ weddingId, guestId, eventType: 'rsvp_submitted', metadata: { status } }),

  shared: (weddingId: string, guestId?: string, channel?: string) =>
    track({ weddingId, guestId, eventType: 'shared', metadata: { channel } }),

  guestbookWritten: (weddingId: string, guestId?: string) =>
    track({ weddingId, guestId, eventType: 'guestbook_written' }),

  galleryViewed: (weddingId: string, guestId?: string) =>
    track({ weddingId, guestId, eventType: 'gallery_viewed' }),

  photoDownloaded: (weddingId: string, guestId?: string, photoId?: string) =>
    track({ weddingId, guestId, eventType: 'photo_downloaded', metadata: { photo_id: photoId } }),

  storyViewed: (weddingId: string, guestId?: string) =>
    track({ weddingId, guestId, eventType: 'story_viewed' }),

  reactionAdded: (weddingId: string, guestId?: string, emoji?: string) =>
    track({ weddingId, guestId, eventType: 'reaction_added', metadata: { emoji } }),

  pageViewed: (weddingId: string, guestId?: string, page?: string) =>
    track({ weddingId, guestId, eventType: 'page_viewed', metadata: { page } }),
}
