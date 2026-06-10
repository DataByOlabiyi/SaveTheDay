-- Migration 001: Add missing guest and guestbook columns
-- These columns are referenced in the application code but were absent from
-- the original schema.sql, causing silent data loss on RSVP submissions.
-- Run this against your existing production database.

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS plus_one_name    TEXT,
  ADD COLUMN IF NOT EXISTS meal_choice      TEXT,
  ADD COLUMN IF NOT EXISTS attending_events JSONB,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

ALTER TABLE guestbook
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}';
