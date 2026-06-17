-- Migration 010: Per-guest controls — block RSVP, per-guest plus-one override
-- Safe to re-run (IF NOT EXISTS on all columns).

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS is_blocked      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_plus_one  BOOLEAN; -- NULL = inherit from wedding config

-- Index for quickly filtering blocked guests
CREATE INDEX IF NOT EXISTS idx_guests_is_blocked ON guests (wedding_id, is_blocked);
