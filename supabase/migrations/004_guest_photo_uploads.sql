-- Migration 004: Add guest attribution to gallery_photos
-- Tracks which guest uploaded a photo via their unique invitation link.
ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS uploaded_by_guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;
