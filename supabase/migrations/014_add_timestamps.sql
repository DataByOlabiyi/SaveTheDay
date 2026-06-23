-- ──────────────────────────────────────────────────────────────
-- Migration 014 — Add updated_at / created_at to core tables
--
-- What: Adds updated_at to weddings, guests, and user_profiles;
--       adds created_at to event_schedule. Creates a shared
--       trigger function and attaches it to each table.
--
-- Why: Without updated_at it is impossible to detect stale cache
--      entries, drive incremental syncs, or show "last modified"
--      metadata in the Studio dashboard. event_schedule lacks
--      created_at entirely, which makes ordering by insertion
--      order unreliable.
--
-- Already handled — do NOT duplicate:
--   subscriptions.updated_at + trigger — migration 008
--
-- Naming: The shared function is update_updated_at_column().
--         It must not conflict with update_subscription_updated_at()
--         from migration 008 — different name, no conflict.
--
-- Risk: ALTER TABLE … ADD COLUMN IF NOT EXISTS is a fast metadata
--       change on Postgres; no table rewrite occurs. DEFAULT now()
--       back-fills existing rows at the current timestamp only on
--       tables where the column did not previously exist. This is
--       acceptable — we do not have historical updated_at data to
--       preserve.
-- ──────────────────────────────────────────────────────────────

-- ── 1. Add columns ─────────────────────────────────────────────

ALTER TABLE weddings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- event_schedule has no created_at in any prior migration.
ALTER TABLE event_schedule
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── 2. Shared trigger function ─────────────────────────────────
-- CREATE OR REPLACE is idempotent.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 3. Attach triggers ─────────────────────────────────────────
-- DROP … IF EXISTS before CREATE keeps this idempotent.

DROP TRIGGER IF EXISTS update_weddings_updated_at ON weddings;
CREATE TRIGGER update_weddings_updated_at
  BEFORE UPDATE ON weddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
