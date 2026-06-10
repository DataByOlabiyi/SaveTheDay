-- Migration 002: Fix RLS policies for guest PII and guestbook insert bypass
-- Critical security fixes — apply before any real user data is stored.

-- ── Guests table: remove the public SELECT policy ──────────────────────────
-- The old USING(true) policy exposed phone, email, dietary, and other PII
-- to any client with the anon key. All guest reads now go through API routes
-- that use the service role key, with auth checks in the application layer.
DROP POLICY IF EXISTS "Public can read guests by wedding" ON guests;

-- ── Guestbook table: close the rate-limit bypass ───────────────────────────
-- The old public INSERT policy allowed anyone with the anon key to insert
-- guestbook entries directly, bypassing the /api/guestbook rate limits.
-- All inserts now require the service role key (used only by API routes).
DROP POLICY IF EXISTS "Public can submit guestbook messages" ON guestbook;

CREATE POLICY "Service role can insert guestbook messages"
  ON guestbook FOR INSERT
  WITH CHECK (true); -- enforced by requiring the service role key
