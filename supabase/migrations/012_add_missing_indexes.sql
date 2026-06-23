-- ──────────────────────────────────────────────────────────────
-- Migration 012 — Add missing performance indexes
--
-- What: Adds indexes that are absent from earlier migrations but
--       are required for the query patterns the application uses.
--
-- Why: Supabase does not auto-index foreign keys. Missing indexes
--      on high-traffic filter columns cause sequential scans that
--      degrade as the dataset grows.
--
-- Indexes already present (do NOT duplicate):
--   idx_user_profiles_role       — migration 002
--   idx_audit_log_admin_id       — migration 002
--   idx_audit_log_created_at     — migration 002
--   idx_guests_is_blocked        — migration 010
--   subscriptions_user_id_unique — migration 008 (unique index on user_id)
--
-- Risks: All statements use IF NOT EXISTS — safe to re-run.
--        The pg_trgm extension is created idempotently; if the
--        Supabase project already has it, CREATE EXTENSION IF NOT EXISTS
--        is a no-op.
-- ──────────────────────────────────────────────────────────────

-- ── weddings ───────────────────────────────────────────────────
-- Slug lookups are the primary key for every page load; ensure a
-- plain btree index exists even if an earlier partial index was dropped.
CREATE INDEX IF NOT EXISTS idx_weddings_slug
  ON weddings (slug);

-- ── guests — communication filter columns ──────────────────────
-- Used by reminder and thank-you email jobs that filter
-- (wedding_id, opened_at IS NOT NULL) or (wedding_id, thankyou_sent_at IS NULL).
CREATE INDEX IF NOT EXISTS idx_guests_opened_at
  ON guests (wedding_id, opened_at);

CREATE INDEX IF NOT EXISTS idx_guests_thankyou_sent
  ON guests (wedding_id, thankyou_sent_at);

-- ── reverse-lookup indexes for optional FKs ────────────────────
-- analytics_events.guest_id and guestbook.guest_id are nullable
-- FKs with no index. Queries that join from a guest outward
-- (e.g. "all events for this guest") hit a seqscan without these.
CREATE INDEX IF NOT EXISTS idx_analytics_guest_id
  ON analytics_events (guest_id);

CREATE INDEX IF NOT EXISTS idx_guestbook_guest_id
  ON guestbook (guest_id);

-- ── user_profiles email trigram search ────────────────────────
-- Admin user-search uses ILIKE '%query%' on email, which requires
-- a GIN trigram index to avoid full-table scans.
-- pg_trgm is a standard Postgres extension; this is idempotent.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_user_profiles_email_gin
  ON user_profiles USING gin (email gin_trgm_ops);
