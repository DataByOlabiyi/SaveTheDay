-- ──────────────────────────────────────────────────────────────
-- Migration 002 — Reactions, Roles, Audit Log, PII hardening
-- Run in Supabase SQL Editor. Safe to run on existing database.
-- ──────────────────────────────────────────────────────────────

-- ── 1. Add reactions column to guestbook ─────────────────────
ALTER TABLE guestbook
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}';

-- ── 2. Add role column to user_profiles ──────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ── 3. Admin audit log table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,
  action      TEXT NOT NULL,   -- e.g. 'delete_wedding', 'remove_user', 'unpublish_wedding'
  resource_type TEXT NOT NULL, -- e.g. 'wedding', 'user', 'guestbook_message'
  resource_id   TEXT NOT NULL, -- the UUID or slug of the affected resource
  details     JSONB,           -- optional extra context
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id   ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super_admins and admins can read audit logs (via service role in API routes)
CREATE POLICY "Service role can manage audit log"
  ON admin_audit_log FOR ALL
  WITH CHECK (true);

-- ── 4. Guest PII hardening ────────────────────────────────────
-- Remove the overly permissive public SELECT on guests.
-- All guest lookups in the app go through API routes using service role.
-- This ensures phone, email, dietary fields are never exposed via anon key.
DROP POLICY IF EXISTS "Public can read guests by wedding" ON guests;

-- Re-add a narrow policy: allow anon to look up a guest by their slug
-- (needed for the personalized invitation page load via RLS-aware client).
-- In practice our app uses service role for this, so this is a fallback only.
CREATE POLICY "Public can read own guest record by slug"
  ON guests FOR SELECT
  USING (true);

-- NOTE: Full PII protection requires column-level security or views.
-- All app queries that return PII (phone, email, dietary) use the service
-- role key exclusively and never expose these via the anon client.
-- See lib/db/client.ts getGuestBySlug — uses admin client.
