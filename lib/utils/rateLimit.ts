// Rate limiter with Upstash Redis when configured, in-memory fallback otherwise.
// Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in .env.local to enable Redis.

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

// ── In-memory fallback ────────────────────────────────────────

interface Record { count: number; resetAt: number }
const store = new Map<string, Record>()

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
let slidingWindow: import('@upstash/ratelimit').Ratelimit | null = null

function getRedisLimiter(limit: number, windowMs: number) {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  // Lazy-initialise once per serverless instance
  if (!redisClient) {
    const { Redis } = require('@upstash/redis')
    redisClient = new Redis({ url, token })
  }

  // Ratelimit uses a fixed-window per (limit, window) pair — create on demand
  const { Ratelimit } = require('@upstash/ratelimit')
  return new Ratelimit({
    redis:     redisClient,
    limiter:   Ratelimit.slidingWindow(limit, `${windowMs}ms`),
    analytics: false,
  })
}

// ── Public API ────────────────────────────────────────────────

export async function checkRateLimitAsync(opts: RateLimitOptions): Promise<RateLimitResult> {
  try {
    const limiter = getRedisLimiter(opts.limit, opts.windowMs)
    if (limiter) {
      const { success, remaining, reset } = await limiter.limit(opts.key)
      return { allowed: success, remaining, resetAt: reset }
    }
  } catch { /* Redis unavailable — fall through to in-memory */ }
  return inMemoryLimit(opts)
}

// Synchronous wrapper kept for backwards compatibility with existing API routes.
// Uses in-memory only (Redis requires async). Upgrade callers to checkRateLimitAsync
// for production Redis support.
export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  return inMemoryLimit(opts)
}
