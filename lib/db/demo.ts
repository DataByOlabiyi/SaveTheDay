// ──────────────────────────────────────────────────────────────
// Demo Wedding Data
// Served at /e/demo-wedding — used as a live product demo
// and as a fallback when Supabase is not configured
// ──────────────────────────────────────────────────────────────

import type { Wedding, Guest, GalleryAlbum, GalleryPhoto, StoryMilestone, EventScheduleItem } from './types'

export const DEMO_WEDDING: Wedding = {
  id: 'demo-wedding-id',
  slug: 'demo-wedding',
  couple_names: { name1: 'Adaeze', name2: 'Emeka' },
  wedding_date: '2050-06-21T14:00:00.000Z', // 21 June 2050 — summer solstice
  venue: 'Eko Hotel & Suites',
  venue_address: 'Plot 1415, Adetokunbo Ademola Street, Victoria Island',
  city: 'Lagos',
  theme: 'unveiling',
  config: {
    // Visibility
    show_countdown:     true,
    show_guestbook:     true,
    show_story:         true,
    show_gallery:       true,
    show_schedule:      true,
    show_venue_map:     false,
    show_gift_registry: false,
    show_post_uploads:  false,
    // RSVP
    allow_plus_one:  true,
    collect_dietary: true,
    rsvp_deadline:   '2050-05-01',
    max_party_size:  6,
    // Timing
    start_time: '14:00',
    end_time:   '22:00',
    // Copy
    intro_text: 'The beginning of forever',
    hashtag:    '#AdaezeAndEmekaForever',
    // Gallery
    allow_downloads: true,
    // Dress code
    dress_code: {
      title: 'Smart Elegant',
      description: 'Ladies in floor-length gowns. Gentlemen in suits. Please avoid all-white and all-red.',
      colors: [
        { color: '#C9A84C', label: 'Gold' },
        { color: '#FAF7F2', label: 'Ivory' },
        { color: '#0B5240', label: 'Forest' },
      ],
    },
  },
  status: 'published',
  is_active: true,
  created_at: new Date().toISOString(),
}

export const DEMO_GUESTS: Guest[] = [
  {
    id: 'guest-1',
    wedding_id: 'demo-wedding-id',
    name: 'Temi Johnson',
    slug: 'temi-johnson',
    phone: '+2348012345678',
    email: 'temi@example.com',
    plus_one: false,
    party_size: 1,
    rsvp_status: 'pending',
    created_at: new Date().toISOString(),
  },
  {
    id: 'guest-2',
    wedding_id: 'demo-wedding-id',
    name: 'David Okafor',
    slug: 'david-okafor',
    phone: '+447911123456',
    email: 'david@example.com',
    plus_one: true,
    party_size: 2,
    rsvp_status: 'attending',
    rsvp_at: new Date().toISOString(),
    opened_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
]

// ──────────────────────────────────────────────────────────────
// Demo Gallery
// ──────────────────────────────────────────────────────────────

export const DEMO_GALLERY_ALBUMS: GalleryAlbum[] = [
  {
    id: 'demo-album-1',
    wedding_id: 'demo-wedding-id',
    name: 'Pre-Wedding Shoot',
    description: 'Golden hour portraits at Lekki Conservation Centre',
    cover_url: undefined,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-album-2',
    wedding_id: 'demo-wedding-id',
    name: 'Engagement Session',
    description: 'Intimate moments captured at Victoria Island',
    cover_url: undefined,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
]

export const DEMO_GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    id: 'demo-photo-1', wedding_id: 'demo-wedding-id', album_id: 'demo-album-1',
    url: 'https://picsum.photos/seed/wed-p1/800/1100',
    thumbnail_url: 'https://picsum.photos/seed/wed-p1/400/550',
    caption: 'Golden hour', width: 800, height: 1100,
    download_count: 0, sort_order: 1, created_at: new Date().toISOString(),
  },
  {
    id: 'demo-photo-2', wedding_id: 'demo-wedding-id', album_id: 'demo-album-1',
    url: 'https://picsum.photos/seed/wed-p2/900/600',
    thumbnail_url: 'https://picsum.photos/seed/wed-p2/450/300',
    caption: 'Laughter and light', width: 900, height: 600,
    download_count: 0, sort_order: 2, created_at: new Date().toISOString(),
  },
  {
    id: 'demo-photo-3', wedding_id: 'demo-wedding-id', album_id: 'demo-album-1',
    url: 'https://picsum.photos/seed/wed-p3/800/1000',
    thumbnail_url: 'https://picsum.photos/seed/wed-p3/400/500',
    caption: undefined, width: 800, height: 1000,
    download_count: 0, sort_order: 3, created_at: new Date().toISOString(),
  },
  {
    id: 'demo-photo-4', wedding_id: 'demo-wedding-id', album_id: 'demo-album-2',
    url: 'https://picsum.photos/seed/wed-p4/900/700',
    thumbnail_url: 'https://picsum.photos/seed/wed-p4/450/350',
    caption: 'Victoria Island sunset', width: 900, height: 700,
    download_count: 0, sort_order: 4, created_at: new Date().toISOString(),
  },
  {
    id: 'demo-photo-5', wedding_id: 'demo-wedding-id', album_id: 'demo-album-2',
    url: 'https://picsum.photos/seed/wed-p5/800/1050',
    thumbnail_url: 'https://picsum.photos/seed/wed-p5/400/525',
    caption: undefined, width: 800, height: 1050,
    download_count: 0, sort_order: 5, created_at: new Date().toISOString(),
  },
  {
    id: 'demo-photo-6', wedding_id: 'demo-wedding-id', album_id: 'demo-album-2',
    url: 'https://picsum.photos/seed/wed-p6/900/600',
    thumbnail_url: 'https://picsum.photos/seed/wed-p6/450/300',
    caption: 'Together', width: 900, height: 600,
    download_count: 0, sort_order: 6, created_at: new Date().toISOString(),
  },
  {
    id: 'demo-photo-7', wedding_id: 'demo-wedding-id', album_id: 'demo-album-1',
    url: 'https://picsum.photos/seed/wed-p7/800/900',
    thumbnail_url: 'https://picsum.photos/seed/wed-p7/400/450',
    caption: undefined, width: 800, height: 900,
    download_count: 0, sort_order: 7, created_at: new Date().toISOString(),
  },
  {
    id: 'demo-photo-8', wedding_id: 'demo-wedding-id', album_id: 'demo-album-2',
    url: 'https://picsum.photos/seed/wed-p8/900/650',
    thumbnail_url: 'https://picsum.photos/seed/wed-p8/450/325',
    caption: 'Forever starts here', width: 900, height: 650,
    download_count: 0, sort_order: 8, created_at: new Date().toISOString(),
  },
]

// ──────────────────────────────────────────────────────────────
// Demo Story Milestones
// ──────────────────────────────────────────────────────────────

export const DEMO_STORY_MILESTONES: StoryMilestone[] = [
  { id: 'demo-ms-1', wedding_id: 'demo-wedding-id', sort_order: 1,
    title: 'We Met', date_label: 'March 2019',
    description: 'A chance encounter at a mutual friend\'s birthday dinner. Words felt easy, time disappeared.',
    emoji: '✨', media_urls: [], created_at: new Date().toISOString() },
  { id: 'demo-ms-2', wedding_id: 'demo-wedding-id', sort_order: 2,
    title: 'First Date', date_label: 'April 2019',
    description: 'Coffee that stretched into five hours of conversation. Two missed movies and zero regrets.',
    emoji: '☕', media_urls: [], created_at: new Date().toISOString() },
  { id: 'demo-ms-3', wedding_id: 'demo-wedding-id', sort_order: 3,
    title: 'First Trip Together', date_label: 'December 2019',
    description: 'A spontaneous weekend away. Sunsets, laughter, and the quiet certainty of something real.',
    emoji: '✈️', media_urls: [], created_at: new Date().toISOString() },
  { id: 'demo-ms-4', wedding_id: 'demo-wedding-id', sort_order: 4,
    title: 'The Proposal', date_label: 'February 2021',
    description: 'Under the stars, down on one knee. She said yes before he could finish the sentence.',
    emoji: '💍', media_urls: [], created_at: new Date().toISOString() },
  { id: 'demo-ms-5', wedding_id: 'demo-wedding-id', sort_order: 5,
    title: 'Forever Begins', date_label: 'Our Wedding Day',
    description: 'Every moment led here. We can\'t wait to begin this next chapter with you by our side.',
    emoji: '💌', media_urls: [], created_at: new Date().toISOString() },
]

// ──────────────────────────────────────────────────────────────
// Demo Event Schedule
// ──────────────────────────────────────────────────────────────

export const DEMO_EVENT_SCHEDULE: EventScheduleItem[] = [
  { id: 'demo-ev-1', wedding_id: 'demo-wedding-id', title: 'Guests Arrive',      time_label: '1:30 PM', description: 'Welcome drinks and light canapés',  emoji: '🥂', sort_order: 1 },
  { id: 'demo-ev-2', wedding_id: 'demo-wedding-id', title: 'Ceremony',            time_label: '2:00 PM', description: 'Eko Hotel Grand Ballroom',           emoji: '💒', sort_order: 2 },
  { id: 'demo-ev-3', wedding_id: 'demo-wedding-id', title: 'Cocktail Hour',       time_label: '3:30 PM', description: 'Garden terrace',                     emoji: '🍹', sort_order: 3 },
  { id: 'demo-ev-4', wedding_id: 'demo-wedding-id', title: 'Reception Opens',     time_label: '5:00 PM', description: 'Grand Ballroom',                     emoji: '🎊', sort_order: 4 },
  { id: 'demo-ev-5', wedding_id: 'demo-wedding-id', title: 'Dinner Service',      time_label: '6:00 PM', description: 'Seated dinner',                      emoji: '🍽️', sort_order: 5 },
  { id: 'demo-ev-6', wedding_id: 'demo-wedding-id', title: 'First Dance & Party', time_label: '8:00 PM', description: 'Dancefloor opens',                   emoji: '💃', sort_order: 6 },
]

export function isDemoMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return !url || url === 'https://your-project.supabase.co'
}
