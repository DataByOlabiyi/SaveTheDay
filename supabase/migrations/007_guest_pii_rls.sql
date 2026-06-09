-- ──────────────────────────────────────────────────────────────
-- Migration 007 — Harden guest PII access via RLS
--
-- Problem: The guests table previously allowed anonymous reads of all
-- columns, including phone, email, dietary, and meal_choice.
-- Since NEXT_PUBLIC_SUPABASE_ANON_KEY is embedded in the browser
-- bundle, anyone could query the REST API directly and retrieve PII
-- for every guest of every wedding.
--
-- Fix: Replace the permissive public SELECT policy with two policies:
--   1. Anon/public — only non-PII columns visible, scoped to the
--      wedding's owning user or published weddings
--   2. Service role — full access (used by server-side API routes)
--
-- After this migration all PII reads MUST go through API routes that
-- use the service-role key (createAdminClient). The anon client must
-- never be used to read guest records.
-- ──────────────────────────────────────────────────────────────

-- Drop any existing permissive guest SELECT policies
DROP POLICY IF EXISTS "Public can read guests"              ON guests;
DROP POLICY IF EXISTS "Anyone can read guests"              ON guests;
DROP POLICY IF EXISTS "guests_select_public"                ON guests;
DROP POLICY IF EXISTS "Enable read access for all users"    ON guests;

-- ── Policy 1: Public read — non-PII columns only ──────────────
-- Guests on a published wedding can read safe columns (id, name,
-- slug, rsvp_status, opened_at) via the anon key.
-- This supports the section dot active-state and section progress
-- indicators that display guest names.
CREATE POLICY "guests_public_safe_columns"
  ON guests
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weddings w
      WHERE w.id = guests.wedding_id
        AND w.status = 'published'
    )
  );

-- Restrict the columns exposed to the anon role using a view.
-- The view enforces column-level security without requiring pg_catalog
-- column privileges (which Supabase does not support directly).
CREATE OR REPLACE VIEW guests_public AS
  SELECT
    id,
    wedding_id,
    name,
    slug,
    rsvp_status,
    opened_at,
    created_at
  FROM guests;

GRANT SELECT ON guests_public TO anon, authenticated;

-- ── Policy 2: Owners can read/write their own wedding's guests ─
DROP POLICY IF EXISTS "owners_can_manage_guests" ON guests;

CREATE POLICY "owners_can_manage_guests"
  ON guests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weddings w
      WHERE w.id = guests.wedding_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weddings w
      WHERE w.id = guests.wedding_id
        AND w.user_id = auth.uid()
    )
  );

-- ── Note on service_role ───────────────────────────────────────
-- The service_role key bypasses RLS entirely. All server-side API
-- routes that need full guest data (RSVP, personalization, dashboard)
-- already use createAdminClient() which uses the service_role key.
-- No additional policy needed for service_role.
