// Rate limiter — Upstash Redis in production, in-memory in development.
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are required in production.
// In-memory is intentionally only for local dev: it does not work across
// multiple serverless instances and provides zero protection in a deployed env.

interface RateLimitOptions {
  key:      string
  limit:    number
  windowMs: number
}

interface RateLimitResult {
  allowed:   boolean
  remaining: number
  resetAt:   number
}

// ── In-memory store (local dev only) ─────────────────────────

interface MemRecord { count: number; resetAt: number }
const store = new Map<string, MemRecord>()

function pruneExpired(now: number) {
  if (store.size < 500) return
  for (const [key, r] of store) { if (r.resetAt <= now) store.delete(key) }
}

function inMemoryLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now    = Date.now()
  pruneExpired(now)
  const record = store.get(key)
  if (!record || record.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }
  record.count++
  return {
    allowed:   record.count <= limit,
    remaining: Math.max(0, limit - record.count),
    resetAt:   record.resetAt,
  }
}

// ── Upstash Redis limiter ─────────────────────────────────────

let redisClient: import('@upstash/redis').Redis | null = null

function getRedisLimiter(limit: number, windowMs: number) {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  if (!redisClient) {
    const { Redis } = require('@upstash/redis')
    redisClient = new Redis({ url, token })
  }

  const { Ratelimit } = require('@upstash/ratelimit')
  return new Ratelimit({
    redis:     redisClient,
    limiter:   Ratelimit.slidingWindow(limit, `${windowMs}ms`),
    analytics: false,
  })
}

const isProduction = process.env.NODE_ENV === 'production'

// ── Public API ────────────────────────────────────────────────

export async function checkRateLimitAsync(opts: RateLimitOptions): Promise<RateLimitResult> {
  const limiter = getRedisLimiter(opts.limit, opts.windowMs)

  if (limiter) {
    try {
      const { success, remaining, reset } = await limiter.limit(opts.key)
      return { allowed: success, remaining, resetAt: reset }
    } catch (err) {
      // Redis is unavailable — fall back to in-memory limiting rather than
      // blocking all traffic. A Redis outage should degrade gracefully, not
      // take down RSVP submissions on an actual wedding day.
      console.error('[rateLimit] Redis error — falling back to in-memory limiting:', err)
      return inMemoryLimit(opts)
    }
  }

  // Redis not configured — warn loudly in production but allow through with
  // in-memory limiting so the app remains functional.
  if (isProduction) {
    console.error('[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN not set in production. Using in-memory fallback (not suitable for multi-instance deployments).')
  }

  return inMemoryLimit(opts)
}

// Synchronous wrapper kept for backwards compatibility.
// Uses in-memory only — do not call from production request paths.
export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  return inMemoryLimit(opts)
}
