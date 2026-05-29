// ──────────────────────────────────────────────────────────────
// Database Types — mirrors the Supabase schema exactly
// ──────────────────────────────────────────────────────────────

export type WeddingTheme = 'unveiling' | 'pages' | 'signal' | 'passport'
export type RSVPStatus = 'pending' | 'attending' | 'declined'
export type AnalyticsEventType =
  | 'opened' | 'seal_tapped' | 'video_watched' | 'rsvp_submitted'
  | 'shared' | 'guestbook_written' | 'gallery_viewed' | 'photo_downloaded'
  | 'story_viewed' | 'reaction_added' | 'page_viewed'

export interface Wedding {
  id: string
  slug: string
  couple_names: { name1: string; name2: string }
  wedding_date: string // ISO timestamp
  venue: string
  venue_address?: string
  city: string
  theme: WeddingTheme
  config: WeddingConfig
  created_at: string
  is_active: boolean
}

export interface DressCodeColor {
  color: string   // hex e.g. "#C9A84C"
  label: string   // "Gold", "Ivory", "Sage"
}

export interface DressCode {
  title:       string             // "Black Tie" / "Smart Casual"
  description?: string
  colors?:     DressCodeColor[]
}

export interface MusicTrack {
  url:     string
  title:   string
  artist?: string
}

export interface WeddingConfig {
  // ── Visibility toggles ──
  show_countdown:       boolean
  show_guestbook:       boolean
  show_story:           boolean
  show_gallery:         boolean
  show_schedule:        boolean
  show_venue_map:       boolean
  show_gift_registry:   boolean
  show_post_uploads:    boolean

  // ── RSVP ──
  allow_plus_one:   boolean
  collect_dietary:  boolean
  rsvp_deadline?:   string
  max_party_size?:  number

  // ── Media ──
  montage_images?:  string[]     // Cloudinary public IDs (legacy)
  montage_video?:   string       // Cloudinary public ID (legacy)
  intro_video_url?: string       // URL for couple intro video splash

  // ── Music ──
  music_track?:    string        // single track URL (legacy)
  music_tracks?:   MusicTrack[]  // multi-track playlist

  // ── Copy ──
  intro_text?:     string
  hashtag?:        string
  hashtag_feed_tag?: string      // for social embed

  // ── Event timing ──
  start_time?: string            // "HH:MM" WAT
  end_time?:   string

  // ── Venue ──
  google_maps_url?: string
  dress_code?:      DressCode

  // ── Gallery controls ──
  allow_downloads:      boolean
  watermark_downloads?: boolean
  download_limit?:      number   // max downloads per guest per day

  // ── Gift registry ──
  gift_registry_url?:  string
  gift_registry_note?: string

  // ── Privacy ──
  is_private?:        boolean
  privacy_password?:  string     // bcrypt hash in production

  // ── Custom colors ──
  colors?: { primary?: string; accent?: string; background?: string }
}

export interface Guest {
  id: string
  wedding_id: string
  name: string
  slug: string // URL-safe identifier e.g. "temi-johnson"
  phone?: string
  email?: string
  plus_one: boolean
  party_size: number
  dietary?: string
  opened_at?: string
  rsvp_status: RSVPStatus
  rsvp_at?: string
  rsvp_note?: string
  created_at: string
}

export interface GuestbookEntry {
  id: string
  wedding_id: string
  guest_id?: string
  guest_name: string
  message: string
  reactions: Record<string, number>  // {"❤️": 3, "🥂": 2}
  created_at: string
}

export interface AnalyticsEvent {
  id: string
  wedding_id: string
  guest_id?: string
  event_type: AnalyticsEventType
  metadata?: Record<string, unknown>
  created_at: string
}

// ── New tables ────────────────────────────────────────────────

export interface StoryMilestone {
  id:          string
  wedding_id:  string
  title:       string
  date_label?: string
  description?: string
  emoji?:      string
  media_urls:  StoryMedia[]
  sort_order:  number
  created_at:  string
}

export interface StoryMedia {
  url:      string
  type:     'photo' | 'video'
  caption?: string
}

export interface GalleryAlbum {
  id:          string
  wedding_id:  string
  name:        string
  description?: string
  cover_url?:  string
  sort_order:  number
  created_at:  string
}

export interface GalleryPhoto {
  id:             string
  wedding_id:     string
  album_id?:      string
  url:            string
  thumbnail_url?: string
  caption?:       string
  width?:         number
  height?:        number
  download_count: number
  sort_order:     number
  created_at:     string
}

export interface EventScheduleItem {
  id:           string
  wedding_id:   string
  title:        string
  time_label:   string
  description?: string
  location?:    string
  emoji?:       string
  sort_order:   number
}

// ── Analytics summary ─────────────────────────────────────────

export interface AnalyticsSummary {
  total_views:       number
  unique_opens:      number
  rsvp_count:        number
  guestbook_count:   number
  gallery_views:     number
  total_downloads:   number
  shares:            number
  by_event:          Record<string, number>
}

// ──────────────────────────────────────────────────────────────
// API / Form types
// ──────────────────────────────────────────────────────────────

export interface RSVPFormData {
  name: string
  email?: string
  phone?: string
  status: RSVPStatus
  party_size: number
  dietary?: string
  note?: string
}

export interface GuestPageProps {
  wedding: Wedding
  guest?: Guest | null
}
