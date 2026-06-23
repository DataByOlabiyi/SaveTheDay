-- Migration 009: Seed demo-wedding as a real database row
-- This removes the need for special-casing in lib/db/client.ts.
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING for all rows.
-- The demo user is a synthetic service-account UUID that owns the demo wedding.
-- It does NOT exist in auth.users, so the weddings.user_id FK is nullable — set to NULL.

-- ── 0. Clear any existing demo-wedding so canonical id is always used ─────────
-- If a demo-wedding row exists with a different id (e.g. from manual seeding),
-- the subsequent ON CONFLICT (slug) DO NOTHING would silently skip the insert,
-- leaving the canonical id absent and breaking every FK reference below.
-- Demo data is safe to drop — it was previously in-memory, not real user data.
DELETE FROM weddings WHERE slug = 'demo-wedding';

-- ── 1. Wedding row ────────────────────────────────────────────────────────────

INSERT INTO weddings (
  id,
  user_id,
  slug,
  couple_names,
  wedding_date,
  venue,
  venue_address,
  city,
  theme,
  config,
  status,
  is_active,
  created_at
)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  NULL,
  'demo-wedding',
  '{"name1": "Adaeze", "name2": "Emeka"}'::jsonb,
  '2050-06-21 14:00:00+00',
  'Eko Hotel & Suites',
  'Plot 1415, Adetokunbo Ademola Street, Victoria Island',
  'Lagos',
  'unveiling',
  '{
    "config_version": 1,
    "show_countdown": true,
    "show_guestbook": true,
    "show_story": true,
    "show_gallery": true,
    "show_schedule": true,
    "show_venue_map": false,
    "show_gift_registry": true,
    "show_post_uploads": false,
    "allow_plus_one": true,
    "collect_dietary": true,
    "rsvp_deadline": "2050-05-01",
    "max_party_size": 6,
    "start_time": "14:00",
    "end_time": "22:00",
    "intro_text": "The beginning of forever",
    "hashtag": "#AdaezeAndEmekaForever",
    "allow_downloads": true,
    "gift_registry_note": "Your presence is our greatest gift. If you wish to bless us further, we''ve shared our details below.",
    "bank_details": [
      {
        "bank_name": "Zenith Bank",
        "account_number": "2012345678",
        "account_name": "Adaeze & Emeka Okafor",
        "label": "Joint Account",
        "currency": "NGN"
      },
      {
        "bank_name": "GTBank",
        "account_number": "0087654321",
        "account_name": "Emeka Okafor",
        "label": "Honeymoon Fund",
        "currency": "NGN",
        "note": "For our honeymoon in Santorini 🌅"
      }
    ],
    "dress_code": {
      "title": "Smart Elegant",
      "description": "Ladies in floor-length gowns. Gentlemen in suits. Please avoid all-white and all-red.",
      "colors": [
        {"color": "#C9A84C", "label": "Gold"},
        {"color": "#FAF7F2", "label": "Ivory"},
        {"color": "#0B5240", "label": "Forest"}
      ]
    }
  }'::jsonb,
  'published',
  true,
  '2024-01-01 00:00:00+00'
)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Guests ─────────────────────────────────────────────────────────────────

-- party_size is in schema.sql but was never added via a migration.
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS party_size INT NOT NULL DEFAULT 1;

INSERT INTO guests (
  id,
  wedding_id,
  name,
  slug,
  phone,
  email,
  plus_one,
  party_size,
  rsvp_status,
  created_at
)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Temi Johnson',
    'temi-johnson',
    '+2348012345678',
    'temi@example.com',
    false,
    1,
    'pending',
    '2024-01-01 00:00:00+00'
  ),
  (
    'b0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'David Okafor',
    'david-okafor',
    '+447911123456',
    'david@example.com',
    true,
    2,
    'attending',
    '2024-01-01 00:00:00+00'
  )
ON CONFLICT (id) DO NOTHING;

-- ── 3. Story milestones ───────────────────────────────────────────────────────

INSERT INTO story_milestones (id, wedding_id, sort_order, title, date_label, description, emoji, media_urls)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    1, 'We Met', 'March 2019',
    'A chance encounter at a mutual friend''s birthday dinner. Words felt easy, time disappeared.',
    '✨', '[]'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    2, 'First Date', 'April 2019',
    'Coffee that stretched into five hours of conversation. Two missed movies and zero regrets.',
    '☕', '[]'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    3, 'First Trip Together', 'December 2019',
    'A spontaneous weekend away. Sunsets, laughter, and the quiet certainty of something real.',
    '✈️', '[]'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000004'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    4, 'The Proposal', 'February 2021',
    'Under the stars, down on one knee. She said yes before he could finish the sentence.',
    '💍', '[]'::jsonb
  ),
  (
    'c0000000-0000-0000-0000-000000000005'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    5, 'Forever Begins', 'Our Wedding Day',
    'Every moment led here. We can''t wait to begin this next chapter with you by our side.',
    '💌', '[]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ── 4. Gallery albums ─────────────────────────────────────────────────────────

INSERT INTO gallery_albums (id, wedding_id, name, description, sort_order)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Pre-Wedding Shoot',
    'Golden hour portraits at Lekki Conservation Centre',
    1
  ),
  (
    'd0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Engagement Session',
    'Intimate moments captured at Victoria Island',
    2
  )
ON CONFLICT (id) DO NOTHING;

-- ── 5. Gallery photos ─────────────────────────────────────────────────────────

INSERT INTO gallery_photos (id, wedding_id, album_id, url, thumbnail_url, caption, width, height, download_count, sort_order)
VALUES
  (
    'e0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'https://picsum.photos/seed/wed-p1/800/1100',
    'https://picsum.photos/seed/wed-p1/400/550',
    'Golden hour', 800, 1100, 0, 1
  ),
  (
    'e0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'https://picsum.photos/seed/wed-p2/900/600',
    'https://picsum.photos/seed/wed-p2/450/300',
    'Laughter and light', 900, 600, 0, 2
  ),
  (
    'e0000000-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'https://picsum.photos/seed/wed-p3/800/1000',
    'https://picsum.photos/seed/wed-p3/400/500',
    NULL, 800, 1000, 0, 3
  ),
  (
    'e0000000-0000-0000-0000-000000000004'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000002'::uuid,
    'https://picsum.photos/seed/wed-p4/900/700',
    'https://picsum.photos/seed/wed-p4/450/350',
    'Victoria Island sunset', 900, 700, 0, 4
  ),
  (
    'e0000000-0000-0000-0000-000000000005'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000002'::uuid,
    'https://picsum.photos/seed/wed-p5/800/1050',
    'https://picsum.photos/seed/wed-p5/400/525',
    NULL, 800, 1050, 0, 5
  ),
  (
    'e0000000-0000-0000-0000-000000000006'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000002'::uuid,
    'https://picsum.photos/seed/wed-p6/900/600',
    'https://picsum.photos/seed/wed-p6/450/300',
    'Together', 900, 600, 0, 6
  ),
  (
    'e0000000-0000-0000-0000-000000000007'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'https://picsum.photos/seed/wed-p7/800/900',
    'https://picsum.photos/seed/wed-p7/400/450',
    NULL, 800, 900, 0, 7
  ),
  (
    'e0000000-0000-0000-0000-000000000008'::uuid,
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000002'::uuid,
    'https://picsum.photos/seed/wed-p8/900/650',
    'https://picsum.photos/seed/wed-p8/450/325',
    'Forever starts here', 900, 650, 0, 8
  )
ON CONFLICT (id) DO NOTHING;

-- ── 6. Event schedule ─────────────────────────────────────────────────────────

INSERT INTO event_schedule (id, wedding_id, title, time_label, description, emoji, sort_order)
VALUES
  ('f0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Guests Arrive',      '1:30 PM', 'Welcome drinks and light canapés',  '🥂', 1),
  ('f0000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Ceremony',           '2:00 PM', 'Eko Hotel Grand Ballroom',          '💒', 2),
  ('f0000000-0000-0000-0000-000000000003'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Cocktail Hour',      '3:30 PM', 'Garden terrace',                    '🍹', 3),
  ('f0000000-0000-0000-0000-000000000004'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Reception Opens',    '5:00 PM', 'Grand Ballroom',                    '🎊', 4),
  ('f0000000-0000-0000-0000-000000000005'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Dinner Service',     '6:00 PM', 'Seated dinner',                     '🍽️', 5),
  ('f0000000-0000-0000-0000-000000000006'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'First Dance & Party','8:00 PM', 'Dancefloor opens',                  '💃', 6)
ON CONFLICT (id) DO NOTHING;

-- ── 7. Notes for cleanup ──────────────────────────────────────────────────────
-- After running this migration against production, the following special-cases
-- in lib/db/client.ts can be removed:
--   - if (slug === 'demo-wedding') return DEMO_WEDDING  (in getWeddingBySlug)
--   - if (weddingId === 'demo-wedding-id') return DEMO_GUESTS  (in getGuests)
--   - if (weddingId === 'demo-wedding-id') return { milestones: DEMO_STORY_MILESTONES, ... }
--   - if (weddingId === 'demo-wedding-id') return DEMO_GALLERY_ALBUMS / DEMO_GALLERY_PHOTOS
--   - if (weddingId === 'demo-wedding-id') return DEMO_EVENT_SCHEDULE
-- The DEMO_WEDDING constant in lib/db/demo.ts should stay as a dev-only fallback
-- (isDemoMode() path) until Supabase is fully required for all environments.
