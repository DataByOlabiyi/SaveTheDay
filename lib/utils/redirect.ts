/** Validate a redirect target — only allow relative, non-protocol-relative paths */
export function safeRedirectPath(next: string | null, fallback = '/studio'): string {
  if (!next) return fallback
  if (next.startsWith('/') && !next.startsWith('//') && !next.includes('://')) {
    return next
  }
  return fallback
}
