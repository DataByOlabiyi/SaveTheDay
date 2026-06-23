import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ──────────────────────────────────────────────────────────────
// Re-declare the RSVP Zod schema here so it can be tested in
// isolation without importing the Next.js route (which pulls in
// server-only modules incompatible with the node test env).
//
// Keep this schema in sync with app/api/rsvp/route.ts.
// ──────────────────────────────────────────────────────────────
const rsvpRequestSchema = z.object({
  weddingId:        z.string().uuid(),
  guestId:          z.string().uuid().optional(),
  name:             z.string().min(2).max(100),
  email:            z.string().email().optional().or(z.literal('')),
  phone:            z.string().min(7).max(20).optional().or(z.literal('')),
  status:           z.enum(['attending', 'declined']),
  party_size:       z.number().min(1).max(20).default(1),
  plus_one_name:    z.string().max(100).optional().or(z.literal('')),
  dietary:          z.string().max(200).optional().or(z.literal('')),
  meal_choice:      z.string().max(100).optional().or(z.literal('')),
  attending_events: z.array(z.string().max(100)).max(10).optional(),
  note:             z.string().max(500).optional().or(z.literal('')),
  turnstileToken:   z.string().optional(),
})

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

const baseValidPayload = {
  weddingId: VALID_UUID,
  name:      'Temi Johnson',
  status:    'attending' as const,
}

// ──────────────────────────────────────────────────────────────
// Happy path
// ──────────────────────────────────────────────────────────────
describe('rsvpRequestSchema — happy path', () => {
  it('accepts a minimal valid payload', () => {
    const result = rsvpRequestSchema.safeParse(baseValidPayload)
    expect(result.success).toBe(true)
  })

  it('defaults party_size to 1 when omitted', () => {
    const result = rsvpRequestSchema.safeParse(baseValidPayload)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.party_size).toBe(1)
  })

  it('accepts status "declined"', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, status: 'declined' })
    expect(result.success).toBe(true)
  })

  it('accepts an optional guestId UUID', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, guestId: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it('accepts empty string for optional fields', () => {
    const result = rsvpRequestSchema.safeParse({
      ...baseValidPayload,
      email:         '',
      phone:         '',
      plus_one_name: '',
      dietary:       '',
      meal_choice:   '',
      note:          '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts up to 10 attending_events', () => {
    const events = Array.from({ length: 10 }, (_, i) => `Event ${i}`)
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, attending_events: events })
    expect(result.success).toBe(true)
  })

  it('accepts party_size at the max boundary (20)', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, party_size: 20 })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────
// Validation failures — weddingId
// ──────────────────────────────────────────────────────────────
describe('rsvpRequestSchema — weddingId validation', () => {
  it('rejects a missing weddingId', () => {
    const { weddingId: _, ...rest } = baseValidPayload
    const result = rsvpRequestSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects a non-UUID weddingId', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, weddingId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────
// Validation failures — name
// ──────────────────────────────────────────────────────────────
describe('rsvpRequestSchema — name validation', () => {
  it('rejects a name shorter than 2 characters', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, name: 'A' })
    expect(result.success).toBe(false)
  })

  it('rejects a name longer than 100 characters', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts a name exactly 2 characters (boundary)', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, name: 'Jo' })
    expect(result.success).toBe(true)
  })

  it('accepts a name exactly 100 characters (boundary)', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, name: 'A'.repeat(100) })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────
// Validation failures — status
// ──────────────────────────────────────────────────────────────
describe('rsvpRequestSchema — status validation', () => {
  it('rejects an invalid status value', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, status: 'maybe' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing status', () => {
    const { status: _, ...rest } = baseValidPayload
    const result = rsvpRequestSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────
// Validation failures — party_size
// ──────────────────────────────────────────────────────────────
describe('rsvpRequestSchema — party_size validation', () => {
  it('rejects party_size of 0', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, party_size: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects party_size above 20', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, party_size: 21 })
    expect(result.success).toBe(false)
  })

  it('rejects a non-numeric party_size', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, party_size: 'two' })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────
// Validation failures — email
// ──────────────────────────────────────────────────────────────
describe('rsvpRequestSchema — email validation', () => {
  it('rejects a malformed email', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid email', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, email: 'guest@example.com' })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────────────────────────────
// Validation failures — attending_events
// ──────────────────────────────────────────────────────────────
describe('rsvpRequestSchema — attending_events validation', () => {
  it('rejects more than 10 events', () => {
    const events = Array.from({ length: 11 }, (_, i) => `Event ${i}`)
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, attending_events: events })
    expect(result.success).toBe(false)
  })

  it('rejects an event name exceeding 100 characters', () => {
    const result = rsvpRequestSchema.safeParse({
      ...baseValidPayload,
      attending_events: ['E'.repeat(101)],
    })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────
// Validation failures — note
// ──────────────────────────────────────────────────────────────
describe('rsvpRequestSchema — note validation', () => {
  it('rejects a note exceeding 500 characters', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, note: 'N'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('accepts a note exactly 500 characters (boundary)', () => {
    const result = rsvpRequestSchema.safeParse({ ...baseValidPayload, note: 'N'.repeat(500) })
    expect(result.success).toBe(true)
  })
})
