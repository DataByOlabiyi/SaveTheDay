import { describe, it, expect, beforeEach } from 'vitest'

// checkRateLimit is the synchronous in-memory wrapper — safe to call in tests
// without Redis. checkRateLimitAsync falls back to the same in-memory logic
// when UPSTASH_REDIS_REST_URL is absent, which is the case in the test env.
import { checkRateLimit, checkRateLimitAsync } from '@/lib/utils/rateLimit'

// The in-memory store is module-level. Use unique keys per test to avoid
// cross-test bleed without needing to reset module state.
let keyCounter = 0
function uniqueKey(prefix = 'test') {
  return `${prefix}:${Date.now()}:${++keyCounter}`
}

// ──────────────────────────────────────────────────────────────
// checkRateLimit (synchronous in-memory)
// ──────────────────────────────────────────────────────────────
describe('checkRateLimit (in-memory sync)', () => {
  it('allows the first request', () => {
    const result = checkRateLimit({ key: uniqueKey(), limit: 5, windowMs: 60_000 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('allows requests up to the limit', () => {
    const key = uniqueKey()
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit({ key, limit: 3, windowMs: 60_000 })
      expect(result.allowed).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const key = uniqueKey()
    const opts = { key, limit: 2, windowMs: 60_000 }
    checkRateLimit(opts) // request 1 — allowed
    checkRateLimit(opts) // request 2 — allowed
    const result = checkRateLimit(opts) // request 3 — blocked
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('remaining decrements with each call', () => {
    const key = uniqueKey()
    const opts = { key, limit: 5, windowMs: 60_000 }
    expect(checkRateLimit(opts).remaining).toBe(4)
    expect(checkRateLimit(opts).remaining).toBe(3)
    expect(checkRateLimit(opts).remaining).toBe(2)
  })

  it('remaining never goes below zero', () => {
    const key = uniqueKey()
    const opts = { key, limit: 1, windowMs: 60_000 }
    checkRateLimit(opts) // uses the 1 allowed
    const result = checkRateLimit(opts) // exceeds — remaining must be 0
    expect(result.remaining).toBe(0)
  })

  it('resets the window after windowMs elapses', async () => {
    const key = uniqueKey()
    const opts = { key, limit: 1, windowMs: 50 } // 50ms window
    checkRateLimit(opts)
    const blocked = checkRateLimit(opts)
    expect(blocked.allowed).toBe(false)

    // Wait for window to expire
    await new Promise(r => setTimeout(r, 100))

    const reset = checkRateLimit(opts)
    expect(reset.allowed).toBe(true)
  })

  it('isolates different keys from each other', () => {
    const key1 = uniqueKey('a')
    const key2 = uniqueKey('b')
    const opts1 = { key: key1, limit: 1, windowMs: 60_000 }
    const opts2 = { key: key2, limit: 1, windowMs: 60_000 }

    checkRateLimit(opts1) // exhaust key1
    checkRateLimit(opts1) // key1 now blocked

    const result = checkRateLimit(opts2) // key2 should still be allowed
    expect(result.allowed).toBe(true)
  })

  it('returns a resetAt timestamp in the future', () => {
    const before = Date.now()
    const result = checkRateLimit({ key: uniqueKey(), limit: 5, windowMs: 60_000 })
    expect(result.resetAt).toBeGreaterThan(before)
  })
})

// ──────────────────────────────────────────────────────────────
// checkRateLimitAsync (falls back to in-memory when Redis absent)
// ──────────────────────────────────────────────────────────────
describe('checkRateLimitAsync (no Redis — in-memory fallback)', () => {
  it('allows the first request', async () => {
    const result = await checkRateLimitAsync({ key: uniqueKey('async'), limit: 5, windowMs: 60_000 })
    expect(result.allowed).toBe(true)
  })

  it('blocks once the limit is exceeded', async () => {
    const key = uniqueKey('async')
    const opts = { key, limit: 2, windowMs: 60_000 }
    await checkRateLimitAsync(opts)
    await checkRateLimitAsync(opts)
    const result = await checkRateLimitAsync(opts)
    expect(result.allowed).toBe(false)
  })
})
