-- Migration 005: Digital invite features — RSVP depth, reminders, thank-you
-- Adds new columns to guests table for enhanced RSVP data and communication tracking.
-- All columns use IF NOT EXISTS so this is safe to re-run.

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS plus_one_name     TEXT,
  ADD COLUMN IF NOT EXISTS meal_choice       TEXT,
  ADD COLUMN IF NOT EXISTS attending_events  TEXT[],
  ADD COLUMN IF NOT EXISTS reminder_sent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS thankyou_sent_at  TIMESTAMPTZ;
