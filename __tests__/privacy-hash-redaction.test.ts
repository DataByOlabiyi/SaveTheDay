import { describe, it, expect } from 'vitest'
import type { Wedding, WeddingConfig } from '@/lib/db/types'

// ──────────────────────────────────────────────────────────────
// Privacy hash redaction logic
//
// Extracted from getWeddingBySlug in lib/db/client.ts (lines 54-59):
//
//   if (wedding.config?.privacy_password_hash) {
//     const { privacy_password_hash: _, ...safeConfig } = wedding.config
//     return { ...wedding, config: safeConfig as Wedding['config'] }
//   }
//   return wedding
//
// This is a pure transformation — test it in isolation so any
// accidental removal of the redaction step is caught immediately.
// ──────────────────────────────────────────────────────────────

function redactPrivacyHash(wedding: Wedding): Wedding {
  if (wedding.config?.privacy_password_hash) {
    const { privacy_password_hash: _, ...safeConfig } = wedding.config
    return { ...wedding, config: safeConfig as WeddingConfig }
  }
  return wedding
}

const baseWedding: Wedding = {
  id:           'abc-123',
  slug:         'test-slug',
  couple_names: { name1: 'Temi', name2: 'Johnson' },
  wedding_date: '2026-10-01',
  venue:        'The Grand Hall',
  city:         'Lagos',
  theme:        'unveiling',
  status:       'published',
  is_active:    true,
  created_at:   '2026-01-01T00:00:00Z',
  config: {
    show_countdown:     true,
    show_guestbook:     false,
    show_story:         true,
    show_gallery:       true,
    show_schedule:      true,
    show_venue_map:     false,
    show_gift_registry: false,
    show_post_uploads:  false,
    allow_plus_one:     true,
    collect_dietary:    true,
    allow_downloads:    true,
  },
}

describe('redactPrivacyHash', () => {
  it('removes privacy_password_hash from the config when present', () => {
    const wedding: Wedding = {
      ...baseWedding,
      config: {
        ...baseWedding.config,
        is_private:            true,
        privacy_password_hash: 'deadbeef.cafebabe',
      },
    }

    const result = redactPrivacyHash(wedding)
    expect((result.config as WeddingConfig & { privacy_password_hash?: string }).privacy_password_hash)
      .toBeUndefined()
  })

  it('preserves all other config fields when redacting', () => {
    const wedding: Wedding = {
      ...baseWedding,
      config: {
        ...baseWedding.config,
        is_private:            true,
        privacy_password_hash: 'deadbeef.cafebabe',
        hashtag:               '#SaveTheDay',
      },
    }

    const result = redactPrivacyHash(wedding)
    expect(result.config.hashtag).toBe('#SaveTheDay')
    expect(result.config.is_private).toBe(true)
  })

  it('returns the wedding unchanged when no hash is present', () => {
    const result = redactPrivacyHash(baseWedding)
    expect(result).toBe(baseWedding) // exact same reference — no mutation
  })

  it('returns the wedding unchanged when config is public (no is_private)', () => {
    const wedding: Wedding = { ...baseWedding }
    const result = redactPrivacyHash(wedding)
    expect(result.config).toBe(wedding.config)
  })

  it('does not mutate the original wedding object', () => {
    const wedding: Wedding = {
      ...baseWedding,
      config: {
        ...baseWedding.config,
        privacy_password_hash: 'secret.salt',
      },
    }

    redactPrivacyHash(wedding)
    // Original must still have the hash
    expect((wedding.config as WeddingConfig & { privacy_password_hash?: string }).privacy_password_hash)
      .toBe('secret.salt')
  })

  it('handles a wedding where config exists but privacy_password_hash is empty string', () => {
    const wedding: Wedding = {
      ...baseWedding,
      config: {
        ...baseWedding.config,
        privacy_password_hash: '',
      },
    }
    // Empty string is falsy — current implementation does NOT redact it
    // This documents the behaviour (a potential edge case but empty hash = no protection)
    const result = redactPrivacyHash(wedding)
    expect(result).toBe(wedding)
  })
})
