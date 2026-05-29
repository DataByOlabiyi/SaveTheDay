import { createClient } from '@supabase/supabase-js'
import type {
  Wedding, Guest, GuestbookEntry, AnalyticsEvent,
  StoryMilestone, GalleryAlbum, GalleryPhoto, EventScheduleItem,
  AnalyticsSummary, AnalyticsEventType,
} from './types'
import {
  DEMO_WEDDING, DEMO_GUESTS,
  DEMO_STORY_MILESTONES, DEMO_GALLERY_ALBUMS, DEMO_GALLERY_PHOTOS, DEMO_EVENT_SCHEDULE,
  isDemoMode,
} from './demo'

// ──────────────────────────────────────────────────────────────
// Supabase client instances
// ──────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

// Public client — for browser use (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client — bypasses RLS, only used in API routes
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ──────────────────────────────────────────────────────────────
// Wedding queries
// ──────────────────────────────────────────────────────────────

export async function getWeddingBySlug(slug: string): Promise<Wedding | null> {
  // Demo mode — return mock data without hitting Supabase
  if (isDemoMode() && slug === 'demo-wedding') return DEMO_WEDDING

  try {
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) return null
    return data as Wedding
  } catch {
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// Guest queries
// ──────────────────────────────────────────────────────────────

export async function getGuestBySlug(
  weddingId: string,
  guestSlug: string
): Promise<Guest | null> {
  if (isDemoMode()) {
    return DEMO_GUESTS.find(g => g.slug === guestSlug && g.wedding_id === weddingId) ?? null
  }

  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('slug', guestSlug)
      .single()

    if (error || !data) return null
    return data as Guest
  } catch {
    return null
  }
}

export async function getGuestsByWedding(weddingId: string): Promise<Guest[]> {
  if (isDemoMode()) return DEMO_GUESTS

  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('name', { ascending: true })

    if (error || !data) return []
    return data as Guest[]
  } catch {
    return []
  }
}

export async function markGuestOpened(guestId: string): Promise<void> {
  await supabase
    .from('guests')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', guestId)
    .is('opened_at', null) // Only update if not already opened
}

export async function submitRSVP(
  guestId: string,
  status: 'attending' | 'declined',
  data: {
    email?: string
    phone?: string
    party_size?: number
    dietary?: string
    note?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const partySize = data.party_size ?? 1
  const { error } = await supabase
    .from('guests')
    .update({
      rsvp_status: status,
      rsvp_at: new Date().toISOString(),
      email: data.email,
      phone: data.phone,
      party_size: partySize,
      plus_one: partySize > 1,
      dietary: data.dietary,
      rsvp_note: data.note,
    })
    .eq('id', guestId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ──────────────────────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────────────────────

export async function trackEvent(
  weddingId: string,
  eventType: AnalyticsEventType,
  guestId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Fire and forget — don't block UX on analytics
  supabase
    .from('analytics_events')
    .insert({
      wedding_id: weddingId,
      guest_id: guestId,
      event_type: eventType,
      metadata,
    })
    .then(() => {}) // Intentionally silent
}

// ──────────────────────────────────────────────────────────────
// Story Milestones
// ──────────────────────────────────────────────────────────────

export async function getStoryMilestones(weddingId: string): Promise<StoryMilestone[]> {
  if (isDemoMode()) return DEMO_STORY_MILESTONES

  try {
    const { data, error } = await supabase
      .from('story_milestones')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })

    if (error || !data) return []
    return data as StoryMilestone[]
  } catch { return [] }
}

// ──────────────────────────────────────────────────────────────
// Gallery
// ──────────────────────────────────────────────────────────────

export async function getGalleryAlbums(weddingId: string): Promise<GalleryAlbum[]> {
  if (isDemoMode()) return DEMO_GALLERY_ALBUMS

  try {
    const { data, error } = await supabase
      .from('gallery_albums')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })

    if (error || !data) return []
    return data as GalleryAlbum[]
  } catch { return [] }
}

export async function getGalleryPhotos(
  weddingId: string,
  albumId?: string
): Promise<GalleryPhoto[]> {
  if (isDemoMode()) {
    return albumId
      ? DEMO_GALLERY_PHOTOS.filter(p => p.album_id === albumId)
      : DEMO_GALLERY_PHOTOS
  }

  try {
    let query = supabase
      .from('gallery_photos')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })

    if (albumId) query = query.eq('album_id', albumId)

    const { data, error } = await query
    if (error || !data) return []
    return data as GalleryPhoto[]
  } catch { return [] }
}

// ──────────────────────────────────────────────────────────────
// Event Schedule
// ──────────────────────────────────────────────────────────────

export async function getEventSchedule(weddingId: string): Promise<EventScheduleItem[]> {
  if (isDemoMode()) return DEMO_EVENT_SCHEDULE

  try {
    const { data, error } = await supabase
      .from('event_schedule')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })

    if (error || !data) return []
    return data as EventScheduleItem[]
  } catch { return [] }
}

// ──────────────────────────────────────────────────────────────
// Analytics summary (admin)
// ──────────────────────────────────────────────────────────────

export async function getAnalyticsSummary(
  weddingId: string
): Promise<AnalyticsSummary> {
  const defaults: AnalyticsSummary = {
    total_views: 0, unique_opens: 0, rsvp_count: 0,
    guestbook_count: 0, gallery_views: 0, total_downloads: 0,
    shares: 0, by_event: {},
  }
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('analytics_events')
      .select('event_type, guest_id')
      .eq('wedding_id', weddingId)

    if (error || !data) return defaults

    const by_event: Record<string, number> = {}
    const uniqueGuests = new Set<string>()
    let rsvp_count = 0, guestbook_count = 0, gallery_views = 0,
        total_downloads = 0, shares = 0

    for (const row of data) {
      by_event[row.event_type] = (by_event[row.event_type] ?? 0) + 1
      if (row.guest_id) uniqueGuests.add(row.guest_id)
      if (row.event_type === 'rsvp_submitted')  rsvp_count++
      if (row.event_type === 'guestbook_written') guestbook_count++
      if (row.event_type === 'gallery_viewed')  gallery_views++
      if (row.event_type === 'photo_downloaded') total_downloads++
      if (row.event_type === 'shared')           shares++
    }

    const { count: total_views } = await admin
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .eq('wedding_id', weddingId)
      .eq('event_type', 'opened')

    return {
      total_views: total_views ?? data.filter(r => r.event_type === 'opened').length,
      unique_opens: uniqueGuests.size,
      rsvp_count, guestbook_count, gallery_views,
      total_downloads, shares, by_event,
    }
  } catch { return defaults }
}

// ──────────────────────────────────────────────────────────────
// Guestbook
// ──────────────────────────────────────────────────────────────

export async function getGuestbookEntries(weddingId: string): Promise<GuestbookEntry[]> {
  const { data, error } = await supabase
    .from('guestbook')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return data as GuestbookEntry[]
}

export async function addGuestbookEntry(
  weddingId: string,
  guestName: string,
  message: string,
  guestId?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('guestbook').insert({
    wedding_id: weddingId,
    guest_id: guestId,
    guest_name: guestName,
    message,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
