import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const guestRowSchema = z.object({
  name:  z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
})

const importBodySchema = z.object({
  weddingId: z.string().uuid(),
  guests:    z.array(guestRowSchema).min(1).max(500),
})

describe('admin guest import schema', () => {
  it('accepts valid import body', () => {
    const result = importBodySchema.safeParse({
      weddingId: '123e4567-e89b-12d3-a456-426614174000',
      guests: [{ name: 'Amaka Johnson', email: 'amaka@example.com', phone: '+2348012345678' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects more than 500 guests', () => {
    const result = importBodySchema.safeParse({
      weddingId: '123e4567-e89b-12d3-a456-426614174000',
      guests: Array.from({ length: 501 }, (_, i) => ({ name: `Guest ${i}` })),
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID', () => {
    const result = importBodySchema.safeParse({
      weddingId: 'not-a-uuid',
      guests: [{ name: 'Test' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects row with empty name', () => {
    const result = guestRowSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects row with invalid email', () => {
    const result = guestRowSchema.safeParse({ name: 'Test', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts row with valid email', () => {
    const result = guestRowSchema.safeParse({ name: 'Test', email: 'test@example.com' })
    expect(result.success).toBe(true)
  })
})
