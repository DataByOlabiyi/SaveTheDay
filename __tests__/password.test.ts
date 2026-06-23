import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/utils/password'

// ──────────────────────────────────────────────────────────────
// hashPassword
// ──────────────────────────────────────────────────────────────
describe('hashPassword', () => {
  it('returns a string in <hash>.<salt> format', async () => {
    const result = await hashPassword('mySecret')
    expect(result).toContain('.')
    const parts = result.split('.')
    expect(parts).toHaveLength(2)
    // hash is 64 bytes hex = 128 chars; salt is 16 bytes hex = 32 chars
    expect(parts[0]).toHaveLength(128)
    expect(parts[1]).toHaveLength(32)
  })

  it('produces different hashes for the same password (random salt)', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2)
  })

  it('hashes an empty string without throwing', async () => {
    const result = await hashPassword('')
    expect(result).toContain('.')
  })
})

// ──────────────────────────────────────────────────────────────
// verifyPassword
// ──────────────────────────────────────────────────────────────
describe('verifyPassword', () => {
  it('returns true for a correct password', async () => {
    const stored = await hashPassword('correctHorse')
    expect(await verifyPassword('correctHorse', stored)).toBe(true)
  })

  it('returns false for a wrong password', async () => {
    const stored = await hashPassword('correctHorse')
    expect(await verifyPassword('wrongPassword', stored)).toBe(false)
  })

  it('returns false when the stored string has no separator', async () => {
    expect(await verifyPassword('any', 'noseparatorhere')).toBe(false)
  })

  it('returns false for an empty stored string', async () => {
    expect(await verifyPassword('any', '')).toBe(false)
  })

  it('returns false when the hash portion is the wrong hex length', async () => {
    // Deliberately malformed stored value — too short a hash
    expect(await verifyPassword('any', 'deadbeef.aabbccdd')).toBe(false)
  })

  it('is case-sensitive', async () => {
    const stored = await hashPassword('Password')
    expect(await verifyPassword('password', stored)).toBe(false)
    expect(await verifyPassword('PASSWORD', stored)).toBe(false)
  })

  it('returns false for a correct hash crossed with a different salt', async () => {
    const stored1 = await hashPassword('secret')
    const stored2 = await hashPassword('secret')
    // Swap hashes and salts across the two stored values
    const [hash1, ] = stored1.split('.')
    const [, salt2]  = stored2.split('.')
    const crossed = `${hash1}.${salt2}`
    expect(await verifyPassword('secret', crossed)).toBe(false)
  })
})
