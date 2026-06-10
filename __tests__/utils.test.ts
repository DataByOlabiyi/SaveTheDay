import { describe, it, expect } from 'vitest'
import { sanitizeText, clampString, isSafeUrl } from '@/lib/utils/sanitize'
import { safeRedirectPath } from '@/lib/utils/redirect'
import { slugify, generateWeddingSlug } from '@/lib/utils/slugify'

// ──────────────────────────────────────────────────────────────
// sanitizeText
// ──────────────────────────────────────────────────────────────
describe('sanitizeText', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('<b>bold</b>')).toBe('bold')
    expect(sanitizeText('<script>alert(1)</script>')).toBe('alert(1)')
  })

  it('removes javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)')
    expect(sanitizeText('JAVASCRIPT:void(0)')).toBe('void(0)')
  })

  it('removes inline event handlers', () => {
    expect(sanitizeText('onclick=bad()')).toBe('bad()')
    expect(sanitizeText('onmouseover = "evil()"')).toBe('"evil()"')
  })

  it('removes control characters', () => {
    expect(sanitizeText('hello\x00world')).toBe('hello world')
    expect(sanitizeText('hello\x1Fworld')).toBe('hello world')
  })

  it('collapses multiple whitespace', () => {
    expect(sanitizeText('hello   world')).toBe('hello world')
  })

  it('trims the result', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  it('passes clean text unchanged', () => {
    const clean = "We're so happy you're coming!"
    expect(sanitizeText(clean)).toBe(clean)
  })
})

// ──────────────────────────────────────────────────────────────
// clampString
// ──────────────────────────────────────────────────────────────
describe('clampString', () => {
  it('truncates strings over the limit', () => {
    expect(clampString('abcdef', 3)).toBe('abc')
  })

  it('returns the string unchanged when within limit', () => {
    expect(clampString('abc', 5)).toBe('abc')
  })

  it('handles exact-length strings', () => {
    expect(clampString('abc', 3)).toBe('abc')
  })
})

// ──────────────────────────────────────────────────────────────
// isSafeUrl
// ──────────────────────────────────────────────────────────────
describe('isSafeUrl', () => {
  it('accepts https URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true)
  })

  it('rejects http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(false)
  })

  it('rejects javascript: protocol', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects non-URL strings', () => {
    expect(isSafeUrl('not-a-url')).toBe(false)
    expect(isSafeUrl('')).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────
// safeRedirectPath
// ──────────────────────────────────────────────────────────────
describe('safeRedirectPath', () => {
  it('allows valid relative paths', () => {
    expect(safeRedirectPath('/studio')).toBe('/studio')
    expect(safeRedirectPath('/studio/settings')).toBe('/studio/settings')
  })

  it('blocks protocol-relative URLs', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/studio')
  })

  it('blocks absolute URLs with protocol', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/studio')
    expect(safeRedirectPath('http://evil.com/hack')).toBe('/studio')
  })

  it('returns fallback when input is null', () => {
    expect(safeRedirectPath(null)).toBe('/studio')
  })

  it('returns fallback when input is empty string', () => {
    expect(safeRedirectPath('')).toBe('/studio')
  })

  it('respects a custom fallback', () => {
    expect(safeRedirectPath(null, '/login')).toBe('/login')
    expect(safeRedirectPath('//bad', '/login')).toBe('/login')
  })
})

// ──────────────────────────────────────────────────────────────
// slugify
// ──────────────────────────────────────────────────────────────
describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Temi Johnson')).toBe('temi-johnson')
  })

  it('strips diacritics', () => {
    expect(slugify('Adéọlá')).toBe('adeola')
  })

  it('collapses multiple spaces/dashes', () => {
    expect(slugify('hello  world')).toBe('hello-world')
    expect(slugify('hello---world')).toBe('hello-world')
  })

  it('trims leading/trailing dashes', () => {
    expect(slugify('-hello-')).toBe('hello')
  })

  it('removes special characters', () => {
    expect(slugify("O'Connor")).toBe('oconnor')
    expect(slugify('name@example')).toBe('nameexample')
  })

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('')
  })

  it('handles all-special-character input', () => {
    expect(slugify('!@#$%')).toBe('')
  })
})

// ──────────────────────────────────────────────────────────────
// generateWeddingSlug
// ──────────────────────────────────────────────────────────────
describe('generateWeddingSlug', () => {
  it('joins both names with -and-', () => {
    expect(generateWeddingSlug('Mojirade', 'Olabiyi')).toBe('mojirade-and-olabiyi')
  })

  it('handles diacritics in both names', () => {
    expect(generateWeddingSlug('Àdéolá', 'Bámidélé')).toBe('adeola-and-bamidele')
  })
})
