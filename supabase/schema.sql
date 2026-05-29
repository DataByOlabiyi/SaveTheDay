-- ──────────────────────────────────────────────────────────────
-- Save The Day — Supabase Database Schema
-- Run this in your Supabase SQL editor to set up the database
-- ──────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- WEDDINGS TABLE
-- One row per couple / wedding event
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weddings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,     -- URL identifier: "adaeze-emeka-2025"
  couple_names  JSONB NOT NULL,            -- {name1: "Adaeze", name2: "Emeka"}
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
    "collect_dietary": true
  }',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast slug lookups (every page load)
CREATE INDEX idx_weddings_slug ON weddings(slug) WHERE is_active = true;

-- ──────────────────────────────────────────────────────────────
-- GUESTS TABLE
-- One row per invited guest per wedding
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guests (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id   UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL,             -- URL slug: "temi-johnson"
  phone        TEXT,
  email        TEXT,
  plus_one     BOOLEAN NOT NULL DEFAULT false,
  dietary      TEXT,
  opened_at    TIMESTAMPTZ,               -- When they first opened the invitation
  rsvp_status  TEXT NOT NULL DEFAULT 'pending'
               CHECK (rsvp_status IN ('pending', 'attending', 'declined')),
  rsvp_at      TIMESTAMPTZ,
  rsvp_note    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique slug per wedding
  UNIQUE(wedding_id, slug)
);

-- Indexes
CREATE INDEX idx_guests_wedding_id ON guests(wedding_id);
CREATE INDEX idx_guests_slug ON guests(wedding_id, slug);
CREATE INDEX idx_guests_rsvp_status ON guests(wedding_id, rsvp_status);

-- ──────────────────────────────────────────────────────────────
-- GUESTBOOK TABLE
-- Real-time messages from guests to the couple
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guestbook (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id   UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id     UUID REFERENCES guests(id) ON DELETE SET NULL,
  guest_name   TEXT NOT NULL,
  message      TEXT NOT NULL CHECK (length(message) <= 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guestbook_wedding_id ON guestbook(wedding_id, created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- ANALYTICS EVENTS TABLE
-- Event stream for tracking engagement
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id   UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_id     UUID REFERENCES guests(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL
               CHECK (event_type IN ('opened', 'seal_tapped', 'video_watched',
                                     'rsvp_submitted', 'shared', 'guestbook_written')),
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_wedding_id ON analytics_events(wedding_id, created_at DESC);
CREATE INDEX idx_analytics_event_type ON analytics_events(wedding_id, event_type);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Guests can only read their own data; writes go through service role
-- ──────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE weddings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook       ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Weddings: public read of active weddings (needed for page load)
CREATE POLICY "Public can read active weddings"
  ON weddings FOR SELECT
  USING (is_active = true);

-- Guests: public read by wedding (for the personalized page to work)
-- In production you'd verify the guest slug matches the URL param
CREATE POLICY "Public can read guests by wedding"
  ON guests FOR SELECT
  USING (true);

-- Guestbook: public read
CREATE POLICY "Public can read guestbook"
  ON guestbook FOR SELECT
  USING (true);

-- Analytics: no public read (admin only via service role)
-- Writes go through service role in API routes (bypasses RLS)

-- ──────────────────────────────────────────────────────────────
-- DEMO DATA
-- Run this after the schema to seed a demo wedding for development
-- ──────────────────────────────────────────────────────────────

INSERT INTO weddings (
  slug,
  couple_names,
  wedding_date,
  venue,
  venue_address,
  city,
  theme,
  config
) VALUES (
  'demo-wedding',
  '{"name1": "Mojirade", "name2": "Olabiyi"}',
  '2026-08-22 00:00:00+00',
  'Eko Hotel & Suites',
  'Plot 1415, Adetokunbo Ademola Street, Victoria Island',
  'Lagos',
  'unveiling',
  '{
    "show_countdown": true,
    "show_guestbook": true,
    "allow_plus_one": true,
    "collect_dietary": true,
    "rsvp_deadline": "2026-09-15",
    "intro_text": "The beginning of forever",
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
