// ──────────────────────────────────────────────────────────────
// Shared in-memory rate limiter
// Works per-dyno/serverless instance — sufficient for typical wedding traffic.
// For multi-region use, swap the Map for an Upstash Redis client.
// ──────────────────────────────────────────────────────────────

interface RateLimitRecord {
  count:   number
  resetAt: number
}

const store = new Map<string, RateLimitRecord>()

// Garbage-collect stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of store) {
    if (record.resetAt <= now) store.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitOptions {
  /** Maximum allowed requests in the window */
  limit:       number
  /** Window size in milliseconds */
  windowMs:    number
  /** Unique key (e.g. `${ip}:${endpoint}`) */
  key:         string
}

interface RateLimitResult {
  allowed:    boolean
  remaining:  number
  resetAt:    number
}

export function checkRateLimit({ limit, windowMs, key }: RateLimitOptions): RateLimitResult {
  const now    = Date.now()
  const record = store.get(key)

  if (!record || record.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  record.count++
  const remaining = Math.max(0, limit - record.count)
  const allowed   = record.count <= limit

  return { allowed, remaining, resetAt: record.resetAt }
}
