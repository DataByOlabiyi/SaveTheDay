// ──────────────────────────────────────────────────────────────
// Input sanitisation utilities
// ──────────────────────────────────────────────────────────────

/** Strip HTML tags, control characters (0x00–0x1F, 0x7F), and injection vectors */
export function sanitizeText(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, ' ')           // control characters (covers null bytes too)
    .replace(/<[^>]*>/g, '')                     // HTML tags
    .replace(/javascript:/gi, '')                // JS protocol
    .replace(/on\w+\s*=/gi, '')                  // inline event handlers
    .replace(/\s+/g, ' ')                        // collapse whitespace
    .trim()
}

/** Validate that a string is a safe external URL (HTTPS only) */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** Clamp a string to max length */
export function clampString(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s
}

/** Check if a string contains only emoji characters (for emoji field) */
export function isSingleEmoji(s: string): boolean {
  // Allow 1-3 characters covering most single emojis
  return s.length <= 8 && /^\p{Emoji_Presentation}/u.test(s)
}
