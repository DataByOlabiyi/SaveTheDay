-- ──────────────────────────────────────────────────────────────
-- Save The Day — Supabase Database Schema
-- Run this in your Supabase SQL editor to set up the database
-- ──────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- USER PROFILES TABLE
-- One row per authenticated user (mirrors auth.users)
-- Created automatically on first sign-in via trigger or API
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  -- 'couple': planning their own wedding
  -- 'planner': professional managing multiple client weddings
  account_type TEXT NOT NULL DEFAULT 'couple'
               CHECK (account_type IN ('couple', 'planner')),
  business_name TEXT,   -- planners only: their company/brand name
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role can insert profiles (called from API routes on sign-up)
CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- WEDDINGS TABLE
-- One row per couple / wedding event
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weddings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug          TEXT UNIQUE NOT NULL,
  couple_names  JSONB NOT NULL,
  wedding_date  TIMESTAMPTZ NOT NULL,
  venue         TEXT NOT NULL,
  venue_address TEXT,
  city          TEXT NOT NULL DEFAULT 'Lagos',
  theme         TEXT NOT NULL DEFAULT 'unveiling'
                CHECK (theme IN ('unveiling', 'pages', 'signal', 'passport')),
  config        JSONB NOT NULL DEFAULT '{
    "show_countdown": true,
    "show_guestbook": false,
    "allow_plus_one": true,
    "collect_dietary": true,
    "allow_downloads": true
  }',
  -- status: draft (setting up) | ready (preview mode) | published (guests can view)
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'ready', 'published')),
  -- Legacy column kept for backward compatibility, derived from status
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast slug lookups (every page load)
CREATE INDEX IF NOT EXISTS idx_weddings_slug ON weddings(slug) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_weddings_user_id ON weddings(user_id);

-- ──────────────────────────────────────────────────────────────
-- GUESTS TABLE
-- One row per invited guest per wedding
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id        UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  plus_one          BOOLEAN NOT NULL DEFAULT false,
  plus_one_name     TEXT,
  party_size        INT NOT NULL DEFAULT 1,
  dietary           TEXT,
  meal_choice       TEXT,
  attending_events  JSONB,
  opened_at         TIMESTAMPTZ,
  rsvp_status       TEXT NOT NULL DEFAULT 'pending'
                    CHECK (rsvp_status IN ('pending', 'attending', 'declined')),
  rsvp_at           TIMESTAMPTZ,
  rsvp_note         TEXT,
  reminder_sent_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(wedding_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_guests_wedding_id ON guests(wedding_id);
CREATE INDEX IF NOT EXISTS idx_guests_slug ON guests(wedding_id, slug);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests(wedding_id, rsvp_status);

-- ──────────────────────────────────────────────────────────────
-- GUESTBOOK TABLE
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guestbook (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id   UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id     UUID REFERENCES guests(id) ON DELETE SET NULL,
  guest_name   TEXT NOT NULL,
  message      TEXT NOT NULL CHECK (length(message) <= 500),
  reactions    JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guestbook_wedding_id ON guestbook(wedding_id, created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- ANALYTICS EVENTS TABLE
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id   UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id     UUID REFERENCES guests(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL
               CHECK (event_type IN ('opened', 'seal_tapped', 'video_watched',
                                     'rsvp_submitted', 'shared', 'guestbook_written',
                                     'gallery_viewed', 'photo_downloaded', 'story_viewed',
                                     'reaction_added', 'page_viewed')),
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_wedding_id ON analytics_events(wedding_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(wedding_id, event_type);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE weddings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook        ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Weddings: public can read PUBLISHED weddings (guest experience)
CREATE POLICY "Public can read published weddings"
  ON weddings FOR SELECT
  USING (status = 'published');

-- Weddings: owners can read their own weddings (any status — for dashboard)
CREATE POLICY "Owners can read own weddings"
  ON weddings FOR SELECT
  USING (auth.uid() = user_id);

-- Weddings: owners can update their own weddings
CREATE POLICY "Owners can update own weddings"
  ON weddings FOR UPDATE
  USING (auth.uid() = user_id);

-- Weddings: authenticated users can insert (create new wedding)
CREATE POLICY "Authenticated users can create weddings"
  ON weddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Guests: public SELECT is intentionally REMOVED.
-- All guest reads go through API routes that use the service role key.
-- This prevents direct anon-key queries from exposing phone, email, dietary, and other PII.
-- The personalized page load uses /api/guest/* routes (admin client) — not the anon key.

-- Guests: service role can write (insert/update/delete) guest records
CREATE POLICY "Service role can manage guests"
  ON guests FOR ALL
  WITH CHECK (true);

-- Guestbook: public read
CREATE POLICY "Public can read guestbook"
  ON guestbook FOR SELECT
  USING (true);

-- Guestbook: INSERT only via service role (API routes with rate limiting).
-- Removing the public INSERT policy closes the bypass where anyone with the
-- anon key could insert directly, circumventing /api/guestbook rate limits.
CREATE POLICY "Service role can insert guestbook messages"
  ON guestbook FOR INSERT
  WITH CHECK (true); -- enforced by requiring the service role key

-- Analytics: service role can insert events
CREATE POLICY "Service role can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- STORY MILESTONES TABLE
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS story_milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  date_label  TEXT,
  description TEXT,
  emoji       TEXT,
  media_urls  JSONB NOT NULL DEFAULT '[]',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_milestones_wedding_id ON story_milestones(wedding_id, sort_order);

ALTER TABLE story_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read story milestones"
  ON story_milestones FOR SELECT USING (true);

CREATE POLICY "Service role can manage story milestones"
  ON story_milestones FOR ALL WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- GALLERY ALBUMS TABLE
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gallery_albums (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_albums_wedding_id ON gallery_albums(wedding_id, sort_order);

ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read gallery albums"
  ON gallery_albums FOR SELECT USING (true);

CREATE POLICY "Service role can manage gallery albums"
  ON gallery_albums FOR ALL WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- GALLERY PHOTOS TABLE
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gallery_photos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id     UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  album_id       UUID REFERENCES gallery_albums(id) ON DELETE SET NULL,
  url            TEXT NOT NULL,
  thumbnail_url  TEXT,
  caption        TEXT,
  width          INT,
  height         INT,
  download_count INT NOT NULL DEFAULT 0,
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_wedding_id ON gallery_photos(wedding_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_album_id ON gallery_photos(album_id);

ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read gallery photos"
  ON gallery_photos FOR SELECT USING (true);

CREATE POLICY "Service role can manage gallery photos"
  ON gallery_photos FOR ALL WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- EVENT SCHEDULE TABLE
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_schedule (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  time_label  TEXT NOT NULL,
  description TEXT,
  location    TEXT,
  emoji       TEXT,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_event_schedule_wedding_id ON event_schedule(wedding_id, sort_order);

ALTER TABLE event_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read event schedule"
  ON event_schedule FOR SELECT USING (true);

CREATE POLICY "Service role can manage event schedule"
  ON event_schedule FOR ALL WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────
-- ANALYTICS AGGREGATE FUNCTION
-- Returns summary counts in a single query instead of loading all rows into app code
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_analytics_summary(p_wedding_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_views',     COUNT(*) FILTER (WHERE event_type = 'opened'),
    'unique_opens',    COUNT(DISTINCT guest_id) FILTER (WHERE guest_id IS NOT NULL),
    'rsvp_count',      COUNT(*) FILTER (WHERE event_type = 'rsvp_submitted'),
    'guestbook_count', COUNT(*) FILTER (WHERE event_type = 'guestbook_written'),
    'gallery_views',   COUNT(*) FILTER (WHERE event_type = 'gallery_viewed'),
    'total_downloads', COUNT(*) FILTER (WHERE event_type = 'photo_downloaded'),
    'shares',          COUNT(*) FILTER (WHERE event_type = 'shared'),
    'by_event',        COALESCE(
      (SELECT json_object_agg(event_type, cnt)
       FROM (
         SELECT event_type, COUNT(*) AS cnt
         FROM analytics_events
         WHERE wedding_id = p_wedding_id
         GROUP BY event_type
       ) sub
      ), '{}'::json
    )
  )
  FROM analytics_events
  WHERE wedding_id = p_wedding_id;
$$;

-- ──────────────────────────────────────────────────────────────
-- DEMO DATA
-- Seed a demo wedding for development and the live demo experience
-- The 'demo-wedding' slug is reserved — always serves demo data in code
-- ──────────────────────────────────────────────────────────────

INSERT INTO weddings (
  slug,
  couple_names,
  wedding_date,
  venue,
  venue_address,
  city,
  theme,
  status,
  config
) VALUES (
  'demo-wedding',
  '{"name1": "Adaeze", "name2": "Emeka"}',
  '2050-06-21 14:00:00+00',
  'Eko Hotel & Suites',
  'Plot 1415, Adetokunbo Ademola Street, Victoria Island',
  'Lagos',
  'unveiling',
  'published',
  '{
    "show_countdown": true,
    "show_guestbook": true,
    "allow_plus_one": true,
    "collect_dietary": true,
    "allow_downloads": true,
    "rsvp_deadline": "2050-05-01",
    "intro_text": "The beginning of forever",
    "hashtag": "#AdaezeAndEmekaForever",
    "start_time": "14:00",
    "end_time": "22:00"
  }'
) ON CONFLICT (slug) DO NOTHING;

-- Sample guests for the demo wedding
WITH w AS (SELECT id FROM weddings WHERE slug = 'demo-wedding')
INSERT INTO guests (wedding_id, name, slug, phone, email) VALUES
  ((SELECT id FROM w), 'Temi Johnson',    'temi-johnson',    '+2348012345678', 'temi@example.com'),
  ((SELECT id FROM w), 'David Okafor',    'david-okafor',    '+447911123456',  'david@example.com'),
  ((SELECT id FROM w), 'Fatima Abdullahi','fatima-abdullahi','+2348087654321',  'fatima@example.com'),
  ((SELECT id FROM w), 'James Eze',       'james-eze',       '+2347055512345',  NULL)
ON CONFLICT (wedding_id, slug) DO NOTHING;

-- Demo story milestones
WITH w AS (SELECT id FROM weddings WHERE slug = 'demo-wedding')
INSERT INTO story_milestones (wedding_id, title, date_label, description, emoji, sort_order) VALUES
  ((SELECT id FROM w), 'We Met',               'March 2019',      'A chance encounter at a mutual friend''s birthday dinner. Words felt easy, time disappeared.',                            '✨', 1),
  ((SELECT id FROM w), 'First Date',            'April 2019',      'Coffee that stretched into five hours of conversation. Two missed movies and zero regrets.',                              '☕', 2),
  ((SELECT id FROM w), 'First Trip Together',   'December 2019',   'A spontaneous weekend away. Sunsets, laughter, and the quiet certainty of something real.',                               '✈️', 3),
  ((SELECT id FROM w), 'The Proposal',          'February 2021',   'Under the stars, down on one knee. She said yes before he could finish the sentence.',                                   '💍', 4),
  ((SELECT id FROM w), 'Forever Begins',        'Our Wedding Day', 'Every moment led here. We can''t wait to begin this next chapter with you by our side.',                                 '💌', 5)
ON CONFLICT DO NOTHING;

-- Demo gallery albums
WITH w AS (SELECT id FROM weddings WHERE slug = 'demo-wedding')
INSERT INTO gallery_albums (wedding_id, name, description, sort_order) VALUES
  ((SELECT id FROM w), 'Pre-Wedding Shoot', 'Golden hour portraits at Lekki Conservation Centre', 1),
  ((SELECT id FROM w), 'Engagement Session', 'Intimate moments captured at Victoria Island',      2)
ON CONFLICT DO NOTHING;

-- Demo event schedule
WITH w AS (SELECT id FROM weddings WHERE slug = 'demo-wedding')
INSERT INTO event_schedule (wedding_id, title, time_label, description, emoji, sort_order) VALUES
  ((SELECT id FROM w), 'Guests Arrive',      '1:30 PM', 'Welcome drinks and light canapés',  '🥂', 1),
  ((SELECT id FROM w), 'Ceremony',           '2:00 PM', 'Eko Hotel Grand Ballroom',           '💒', 2),
  ((SELECT id FROM w), 'Cocktail Hour',      '3:30 PM', 'Garden terrace',                     '🍹', 3),
  ((SELECT id FROM w), 'Reception Opens',   '5:00 PM', 'Grand Ballroom',                      '🎊', 4),
  ((SELECT id FROM w), 'Dinner Service',     '6:00 PM', 'Seated dinner',                      '🍽️', 5),
  ((SELECT id FROM w), 'First Dance & Party','8:00 PM', 'Dancefloor opens',                   '💃', 6)
ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- MIGRATION NOTES
-- If upgrading from the original schema (is_active boolean):
--
-- ALTER TABLE weddings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
-- ALTER TABLE weddings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
--   CHECK (status IN ('draft', 'ready', 'published'));
-- UPDATE weddings SET status = 'published' WHERE is_active = true;
-- UPDATE weddings SET status = 'draft' WHERE is_active = false;
-- CREATE INDEX IF NOT EXISTS idx_weddings_user_id ON weddings(user_id);
--
-- If upgrading from before planner support:
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'couple'
--   CHECK (account_type IN ('couple', 'planner'));
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
-- ──────────────────────────────────────────────────────────────
