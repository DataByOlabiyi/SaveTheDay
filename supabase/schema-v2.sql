-- ──────────────────────────────────────────────────────────────
-- Save The Day — Schema v2 Migrations
-- Run AFTER schema.sql to add new tables and columns
-- Safe to re-run: tables use IF NOT EXISTS; policies use
-- DROP IF EXISTS before CREATE (Postgres has no CREATE POLICY IF NOT EXISTS)
-- ──────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────
-- LOVE STORY MILESTONES
-- Ordered timeline entries with optional media
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS story_milestones (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  date_label  TEXT,                        -- "June 2020", "Summer 2019"
  description TEXT CHECK (length(description) <= 1000),
  emoji       TEXT,                        -- "💍" "☕" "✈️" "💌"
  media_urls  JSONB NOT NULL DEFAULT '[]', -- [{url, type:'photo'|'video', caption}]
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_milestones_wedding
  ON story_milestones(wedding_id, sort_order);

ALTER TABLE story_milestones ENABLE ROW LEVEL SECURITY;

-- NOTE: Postgres does NOT support CREATE POLICY IF NOT EXISTS
-- Use DROP … IF EXISTS then CREATE instead
DROP POLICY IF EXISTS "Public can read story milestones" ON story_milestones;
CREATE POLICY "Public can read story milestones"
  ON story_milestones FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────────────
-- GALLERY ALBUMS
-- Logical groupings for pre-wedding photos
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_albums (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_albums_wedding
  ON gallery_albums(wedding_id, sort_order);

ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read gallery albums" ON gallery_albums;
CREATE POLICY "Public can read gallery albums"
  ON gallery_albums FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────────────
-- GALLERY PHOTOS
-- Individual photos within albums
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_photos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id      UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  album_id        UUID REFERENCES gallery_albums(id) ON DELETE SET NULL,
  url             TEXT NOT NULL,
  thumbnail_url   TEXT,
  caption         TEXT,
  width           INT,
  height          INT,
  download_count  INT NOT NULL DEFAULT 0,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_wedding
  ON gallery_photos(wedding_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_album
  ON gallery_photos(album_id, sort_order);

ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read gallery photos" ON gallery_photos;
CREATE POLICY "Public can read gallery photos"
  ON gallery_photos FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────────────
-- EVENT SCHEDULE
-- Day-of timeline (ceremony → cocktails → reception → dinner)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_schedule (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wedding_id  UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  time_label  TEXT NOT NULL,   -- "2:00 PM", "3:30 PM"
  description TEXT,
  location    TEXT,
  emoji       TEXT,            -- "💒" "🥂" "🎊" "🍽️"
  sort_order  INT  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_event_schedule_wedding
  ON event_schedule(wedding_id, sort_order);

ALTER TABLE event_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read event schedule" ON event_schedule;
CREATE POLICY "Public can read event schedule"
  ON event_schedule FOR SELECT USING (true);

-- ──────────────────────────────────────────────────────────────
-- GUESTBOOK REACTIONS
-- Emoji reactions on individual guestbook entries
-- ──────────────────────────────────────────────────────────────
ALTER TABLE guestbook
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}';
-- Format: {"❤️": 3, "🥂": 2, "✨": 1, "🎊": 0}

-- ──────────────────────────────────────────────────────────────
-- ANALYTICS EVENT TYPES EXTENSION
-- Expand the event_type CHECK constraint to include new types
-- ──────────────────────────────────────────────────────────────
ALTER TABLE analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

ALTER TABLE analytics_events
  ADD CONSTRAINT analytics_events_event_type_check
  CHECK (event_type IN (
    'opened', 'seal_tapped', 'video_watched', 'rsvp_submitted',
    'shared', 'guestbook_written', 'gallery_viewed', 'photo_downloaded',
    'story_viewed', 'reaction_added', 'page_viewed'
  ));

-- ──────────────────────────────────────────────────────────────
-- PARTY SIZE
-- Stores actual headcount per guest; plus_one is kept for
-- backwards compatibility and derived as party_size > 1
-- ──────────────────────────────────────────────────────────────
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS party_size INT NOT NULL DEFAULT 1;

-- ──────────────────────────────────────────────────────────────
-- PHOTO DOWNLOAD TRACKING
-- Increment download count atomically to avoid race conditions
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_download_count(photo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE gallery_photos
  SET download_count = download_count + 1
  WHERE id = photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- STORAGE BUCKETS
-- Create these in Supabase Dashboard → Storage if not already done
-- ──────────────────────────────────────────────────────────────
-- wedding-gallery  (public = true)  — guest photo uploads & gallery
-- story-media      (public = true)  — love story milestone photos/videos

-- ──────────────────────────────────────────────────────────────
-- DEMO DATA v2
-- Inserts sample content for the demo-wedding slug.
-- Uses DO NOTHING so re-running is safe (no duplicate check needed;
-- each run generates new UUIDs so you can safely run once).
-- ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_wedding_id UUID;
BEGIN
  SELECT id INTO v_wedding_id FROM weddings WHERE slug = 'demo-wedding';

  -- Only insert if the demo wedding exists
  IF v_wedding_id IS NOT NULL THEN

    -- Story milestones (only if none yet)
    IF NOT EXISTS (SELECT 1 FROM story_milestones WHERE wedding_id = v_wedding_id) THEN
      INSERT INTO story_milestones (wedding_id, title, date_label, description, emoji, sort_order)
      VALUES
        (v_wedding_id, 'We Met', 'March 2019',
         'A chance encounter at a mutual friend''s birthday dinner. Mojirade was the last to arrive, and Olabiyi couldn''t take his eyes off her the entire evening.',
         '✨', 1),
        (v_wedding_id, 'First Date', 'April 2019',
         'Coffee at Terra Kulture that stretched into a 5-hour conversation. They missed two movies and didn''t care at all.',
         '☕', 2),
        (v_wedding_id, 'First Trip Together', 'December 2019',
         'A spontaneous weekend in Accra that turned into their favourite shared memory. They still talk about the sunset at Labadi Beach.',
         '✈️', 3),
        (v_wedding_id, 'The Proposal', 'February 2021',
         'Under the stars at their favourite restaurant rooftop, Olabiyi got down on one knee and asked the question. She said yes before he could finish the sentence.',
         '💍', 4),
        (v_wedding_id, 'Forever Begins', 'August 2026',
         'After years of laughter, adventures, and growing together — the next chapter starts here.',
         '💌', 5);
    END IF;

    -- Gallery albums (only if none yet)
    IF NOT EXISTS (SELECT 1 FROM gallery_albums WHERE wedding_id = v_wedding_id) THEN
      INSERT INTO gallery_albums (wedding_id, name, description, sort_order)
      VALUES
        (v_wedding_id, 'Pre-Wedding Shoot', 'Golden hour portraits at Lekki Conservation Centre', 1),
        (v_wedding_id, 'Engagement Session', 'Intimate moments captured at Victoria Island', 2);
    END IF;

    -- Event schedule (only if none yet)
    IF NOT EXISTS (SELECT 1 FROM event_schedule WHERE wedding_id = v_wedding_id) THEN
      INSERT INTO event_schedule (wedding_id, title, time_label, description, emoji, sort_order)
      VALUES
        (v_wedding_id, 'Guests Arrive',      '1:30 PM', 'Welcome drinks and light canapés', '🥂', 1),
        (v_wedding_id, 'Ceremony',            '2:00 PM', 'Eko Hotel Grand Ballroom',         '💒', 2),
        (v_wedding_id, 'Cocktail Hour',       '3:30 PM', 'Garden terrace',                   '🍹', 3),
        (v_wedding_id, 'Reception Opens',     '5:00 PM', 'Grand Ballroom',                   '🎊', 4),
        (v_wedding_id, 'Dinner Service',      '6:00 PM', 'Seated dinner',                    '🍽️', 5),
        (v_wedding_id, 'First Dance & Party', '8:00 PM', 'Dancefloor opens',                 '💃', 6);
    END IF;

  END IF;
END
$$;
