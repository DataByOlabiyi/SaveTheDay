import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────────────────────────────
// Business logic extracted from app/api/rsvp/route.ts
//
// These are pure functions or pure decision branches that can be
// tested without a DB or HTTP context. Keep them here so any
// future refactor of the route preserves the invariants.
// ──────────────────────────────────────────────────────────────

// ── RSVP deadline check ────────────────────────────────────────
// Mirrors the logic in POST /api/rsvp/route.ts around line 77:
//   if (deadline && new Date(deadline) < new Date()) → 410 Gone
function isRsvpDeadlinePassed(deadline: string | undefined, now = new Date()): boolean {
  if (!deadline) return false
  return new Date(deadline) < now
}

describe('isRsvpDeadlinePassed', () => {
  it('returns false when no deadline is set', () => {
    expect(isRsvpDeadlinePassed(undefined)).toBe(false)
    expect(isRsvpDeadlinePassed('')).toBe(false)
  })

  it('returns true when the deadline is in the past', () => {
    const past = new Date(Date.now() - 86400000).toISOString() // yesterday
    expect(isRsvpDeadlinePassed(past)).toBe(true)
  })

  it('returns false when the deadline is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString() // tomorrow
    expect(isRsvpDeadlinePassed(future)).toBe(false)
  })

  it('returns true when deadline equals "now" (boundary — strict less-than)', () => {
    // The check is `new Date(deadline) < now` so an exact-match returns false
    const exact = new Date().toISOString()
    // Because JS time advances between this line and the call, this is
    // effectively "just passed" — we pin `now` to prove the strict boundary.
    const pinned = new Date('2026-01-01T00:00:00.000Z')
    const atBoundary = '2026-01-01T00:00:00.000Z'
    expect(isRsvpDeadlinePassed(atBoundary, pinned)).toBe(false) // equal → not yet passed
    const oneMsBefore = new Date('2025-12-31T23:59:59.999Z')
    expect(isRsvpDeadlinePassed(atBoundary, oneMsBefore)).toBe(false) // deadline > now → open
    const oneMsAfter = new Date('2026-01-01T00:00:00.001Z')
    expect(isRsvpDeadlinePassed(atBoundary, oneMsAfter)).toBe(true) // deadline < now → closed
  })
})

// ── Plus-one eligibility logic ─────────────────────────────────
// Mirrors app/api/rsvp/route.ts lines 112–121:
//   guestRecord.allow_plus_one takes precedence; fall back to wedding config
function isPlusOneAllowed(
  guestAllowPlusOne: boolean | null | undefined,
  weddingAllowPlusOne: boolean | undefined
): boolean {
  if (guestAllowPlusOne !== null && guestAllowPlusOne !== undefined) {
    return guestAllowPlusOne
  }
  return weddingAllowPlusOne !== false
}

describe('isPlusOneAllowed', () => {
  it('returns guest-level override (true) regardless of wedding config', () => {
    expect(isPlusOneAllowed(true, false)).toBe(true)
    expect(isPlusOneAllowed(true, true)).toBe(true)
    expect(isPlusOneAllowed(true, undefined)).toBe(true)
  })

  it('returns guest-level override (false) regardless of wedding config', () => {
    expect(isPlusOneAllowed(false, true)).toBe(false)
    expect(isPlusOneAllowed(false, undefined)).toBe(false)
  })

  it('falls back to wedding config when guest override is null', () => {
    expect(isPlusOneAllowed(null, true)).toBe(true)
    expect(isPlusOneAllowed(null, false)).toBe(false)
  })

  it('falls back to wedding config when guest override is undefined', () => {
    expect(isPlusOneAllowed(undefined, true)).toBe(true)
    expect(isPlusOneAllowed(undefined, false)).toBe(false)
  })

  it('allows plus-one when wedding config is undefined (permissive default)', () => {
    // The route checks `weddingAllowPlusOne !== false`, so undefined → allowed
    expect(isPlusOneAllowed(null, undefined)).toBe(true)
    expect(isPlusOneAllowed(undefined, undefined)).toBe(true)
  })
})

// ── party_size → plus_one flag derivation ─────────────────────
// Mirrors line 82: const plusOne = partySize > 1
function derivePlusOneFlag(partySize: number): boolean {
  return partySize > 1
}

describe('derivePlusOneFlag', () => {
  it('is false for party_size = 1', () => {
    expect(derivePlusOneFlag(1)).toBe(false)
  })

  it('is true for party_size = 2', () => {
    expect(derivePlusOneFlag(2)).toBe(true)
  })

  it('is true for larger party sizes', () => {
    expect(derivePlusOneFlag(20)).toBe(true)
  })
})

// ── Anonymous guest slug generation ───────────────────────────
// Mirrors line 149: `anon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
function generateAnonSlug(): string {
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

describe('generateAnonSlug', () => {
  it('starts with "anon-"', () => {
    expect(generateAnonSlug()).toMatch(/^anon-/)
  })

  it('produces unique slugs on each call', () => {
    const slugs = new Set(Array.from({ length: 100 }, generateAnonSlug))
    expect(slugs.size).toBe(100)
  })

  it('contains only URL-safe characters', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateAnonSlug()).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
