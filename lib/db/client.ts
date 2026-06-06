import { createClient } from '@supabase/supabase-js'
import type {
  Wedding, Guest, GuestbookEntry,
  StoryMilestone, GalleryAlbum, GalleryPhoto, EventScheduleItem,
  AnalyticsSummary, AnalyticsEventType, UserProfile, CreateWeddingInput,
} from './types'
import {
  DEMO_WEDDING, DEMO_GUESTS,
  DEMO_STORY_MILESTONES, DEMO_GALLERY_ALBUMS, DEMO_GALLERY_PHOTOS, DEMO_EVENT_SCHEDULE,
} from './demo'
import { slugify } from '@/lib/utils/slugify'

// ──────────────────────────────────────────────────────────────
// Supabase clients
// ──────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

// Public anon client (respects RLS) — for guest-facing reads
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
  // The reserved demo slug always returns demo data without hitting Supabase
  if (slug === 'demo-wedding') return DEMO_WEDDING

  try {
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !data) return null

    // Redact password hash — it must never reach the client
    const wedding = data as Wedding
    if (wedding.config?.privacy_password_hash) {
      const { privacy_password_hash: _, ...safeConfig } = wedding.config
      return { ...wedding, config: safeConfig as Wedding['config'] }
    }
    return wedding
  } catch {
    return null
  }
}

/** For internal use only — returns the full config including privacy_password_hash for verification. */
export async function getWeddingForPasswordCheck(slug: string): Promise<Wedding | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('weddings')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !data) return null
    return data as Wedding
  } catch {
    return null
  }
}

// Used by the dashboard — needs to see all statuses for the owning user
export async function getWeddingBySlugForOwner(
  slug: string,
  userId: string
): Promise<Wedding | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('weddings')
      .select('*')
      .eq('slug', slug)
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return data as Wedding
  } catch {
    return null
  }
}

export async function getWeddingsByUser(userId: string): Promise<Wedding[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('weddings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error || !data) return []
    return data as Wedding[]
  } catch {
    return []
  }
}

export async function createWedding(
  userId: string,
  input: CreateWeddingInput
): Promise<{ wedding: Wedding | null; error?: string }> {
  try {
    const admin = createAdminClient()

    const baseSlug = slugify(`${input.name1}-${input.name2}`)
    let slug = baseSlug
    let attempt = 0

    // Find a unique slug
    while (attempt < 10) {
      const { data: existing } = await admin
        .from('weddings')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existing) break
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    const { data, error } = await admin
      .from('weddings')
      .insert({
        user_id: userId,
        slug,
        couple_names: { name1: input.name1, name2: input.name2 },
        wedding_date: input.wedding_date,
        venue: input.venue,
        city: input.city ?? 'Lagos',
        status: 'draft',
        config: {
          show_countdown: true,
          show_guestbook: false,
          allow_plus_one: true,
          collect_dietary: true,
          allow_downloads: true,
        },
      })
      .select()
      .single()

    if (error) return { wedding: null, error: error.message }

    const newWedding = data as Wedding

    // Seed default story stubs — visible only once couple adds descriptions
    try {
      await admin.from('story_milestones').insert([
        { wedding_id: newWedding.id, title: 'How We Met',          emoji: '✨', sort_order: 1, media_urls: [] },
        { wedding_id: newWedding.id, title: 'Our First Date',       emoji: '☕', sort_order: 2, media_urls: [] },
        { wedding_id: newWedding.id, title: 'First Trip Together',  emoji: '✈️', sort_order: 3, media_urls: [] },
        { wedding_id: newWedding.id, title: 'The Proposal',         emoji: '💍', sort_order: 4, media_urls: [] },
        { wedding_id: newWedding.id, title: 'Forever Begins',       emoji: '💌', sort_order: 5, media_urls: [] },
      ])
    } catch { /* table may not exist yet — non-fatal */ }

    // Seed default gallery album stubs — visible only once photos are uploaded
    try {
      await admin.from('gallery_albums').insert([
        { wedding_id: newWedding.id, name: 'Pre-Wedding Shoot',  sort_order: 1 },
        { wedding_id: newWedding.id, name: 'Engagement Session', sort_order: 2 },
      ])
    } catch { /* table may not exist yet — non-fatal */ }

    return { wedding: newWedding }
  } catch (err) {
    return { wedding: null, error: String(err) }
  }
}

export async function updateWeddingStatus(
  weddingId: string,
  status: 'draft' | 'ready' | 'published'
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('weddings')
      .update({ status, is_active: status === 'published' })
      .eq('id', weddingId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ──────────────────────────────────────────────────────────────
// User profile queries
// ──────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return data as UserProfile
  } catch {
    return null
  }
}

export async function upsertUserProfile(
  userId: string,
  email: string,
  options?: {
    fullName?: string
    accountType?: 'couple' | 'planner'
    businessName?: string
  }
): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('user_profiles').upsert(
      {
        id:            userId,
        email,
        full_name:     options?.fullName     ?? null,
        account_type:  options?.accountType  ?? 'couple',
        business_name: options?.businessName ?? null,
      },
      { onConflict: 'id' }
    )
  } catch {
    // Non-fatal
  }
}

// ──────────────────────────────────────────────────────────────
// Guest queries
// ──────────────────────────────────────────────────────────────

export async function getGuestBySlug(
  weddingId: string,
  guestSlug: string
): Promise<Guest | null> {
  if (weddingId === DEMO_WEDDING.id) {
    return DEMO_GUESTS.find(g => g.slug === guestSlug) ?? null
  }

  try {
    // Use admin client — guest records contain PII (phone, email, dietary)
    // that must not be exposed via the anon key
    const admin = createAdminClient()
    const { data, error } = await admin
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
  if (weddingId === DEMO_WEDDING.id) return DEMO_GUESTS

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
  const admin = createAdminClient()
  await admin
    .from('guests')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', guestId)
    .is('opened_at', null)
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
  supabase
    .from('analytics_events')
    .insert({ wedding_id: weddingId, guest_id: guestId, event_type: eventType, metadata })
    .then(() => {})
}

export async function getAnalyticsSummary(weddingId: string): Promise<AnalyticsSummary> {
  const defaults: AnalyticsSummary = {
    total_views: 0, unique_opens: 0, rsvp_count: 0,
    guestbook_count: 0, gallery_views: 0, total_downloads: 0,
    shares: 0, by_event: {},
  }
  try {
    const admin = createAdminClient()

    // Use SQL aggregates — single query instead of fetching all rows into JS
    const { data, error } = await admin.rpc('get_analytics_summary', { p_wedding_id: weddingId })

    if (!error && data) {
      // RPC returns a single row with all aggregated counts
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        return {
          total_views:     row.total_views     ?? 0,
          unique_opens:    row.unique_opens    ?? 0,
          rsvp_count:      row.rsvp_count      ?? 0,
          guestbook_count: row.guestbook_count ?? 0,
          gallery_views:   row.gallery_views   ?? 0,
          total_downloads: row.total_downloads ?? 0,
          shares:          row.shares          ?? 0,
          by_event:        row.by_event        ?? {},
        }
      }
    }

    // Fallback: if the RPC doesn't exist yet, aggregate in JS over a capped row set
    const { data: rows, error: fallbackError } = await admin
      .from('analytics_events')
      .select('event_type, guest_id')
      .eq('wedding_id', weddingId)
      .limit(5000)

    if (fallbackError || !rows) return defaults

    const by_event: Record<string, number> = {}
    const uniqueGuests = new Set<string>()
    let rsvp_count = 0, guestbook_count = 0, gallery_views = 0,
        total_downloads = 0, shares = 0, total_views = 0

    for (const row of rows) {
      by_event[row.event_type] = (by_event[row.event_type] ?? 0) + 1
      if (row.guest_id) uniqueGuests.add(row.guest_id)
      if (row.event_type === 'opened')           total_views++
      if (row.event_type === 'rsvp_submitted')   rsvp_count++
      if (row.event_type === 'guestbook_written') guestbook_count++
      if (row.event_type === 'gallery_viewed')   gallery_views++
      if (row.event_type === 'photo_downloaded') total_downloads++
      if (row.event_type === 'shared')           shares++
    }

    return {
      total_views, unique_opens: uniqueGuests.size,
      rsvp_count, guestbook_count, gallery_views,
      total_downloads, shares, by_event,
    }
  } catch { return defaults }
}

// ──────────────────────────────────────────────────────────────
// Story Milestones
// ──────────────────────────────────────────────────────────────

export async function getStoryMilestones(weddingId: string): Promise<StoryMilestone[]> {
  if (weddingId === DEMO_WEDDING.id) return DEMO_STORY_MILESTONES

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
  if (weddingId === DEMO_WEDDING.id) return DEMO_GALLERY_ALBUMS

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
  if (weddingId === DEMO_WEDDING.id) {
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
  if (weddingId === DEMO_WEDDING.id) return DEMO_EVENT_SCHEDULE

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
