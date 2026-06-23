-- ──────────────────────────────────────────────────────────────
-- Migration 001 — New RLS policies + analytics aggregate function
-- Run this in Supabase SQL Editor (not the full schema.sql)
-- Safe to run multiple times (uses DROP IF EXISTS before CREATE)
-- ──────────────────────────────────────────────────────────────

-- ── Guests: service role write policy ────────────────────────
DROP POLICY IF EXISTS "Service role can manage guests" ON guests;
CREATE POLICY "Service role can manage guests"
  ON guests FOR ALL
  WITH CHECK (true);

-- ── Guestbook: public insert ──────────────────────────────────
DROP POLICY IF EXISTS "Public can submit guestbook messages" ON guestbook;
CREATE POLICY "Public can submit guestbook messages"
  ON guestbook FOR INSERT
  WITH CHECK (length(message) > 0 AND length(message) <= 500);

-- ── Analytics: service role insert ───────────────────────────
DROP POLICY IF EXISTS "Service role can insert analytics events" ON analytics_events;
CREATE POLICY "Service role can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- ── Analytics aggregate function ─────────────────────────────
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
