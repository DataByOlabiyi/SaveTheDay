import { describe, it, expect } from 'vitest'
import { slugify, generateWeddingSlug, generateInitialWeddingSlug } from '@/lib/utils/slugify'

// ── generateInitialWeddingSlug — not covered by existing tests ──
describe('generateInitialWeddingSlug', () => {
  it('starts with "wedding-"', () => {
    expect(generateInitialWeddingSlug(2026)).toMatch(/^wedding-/)
  })

  it('contains the year', () => {
    expect(generateInitialWeddingSlug(2026)).toContain('2026')
  })

  it('ends with a 4-character alphanumeric suffix', () => {
    expect(generateInitialWeddingSlug(2026)).toMatch(/^wedding-\d{4}-[a-z0-9]{4}$/)
  })

  it('produces different slugs on each call (random suffix)', () => {
    const slugs = new Set(Array.from({ length: 50 }, () => generateInitialWeddingSlug(2026)))
    // With a 4-char base36 suffix the collision probability is negligible
    expect(slugs.size).toBeGreaterThan(1)
  })
})

// ── Additional slugify edge cases ──────────────────────────────
describe('slugify — additional edge cases', () => {
  it('handles numeric-only input', () => {
    expect(slugify('2024')).toBe('2024')
  })

  it('handles mixed numbers and words', () => {
    expect(slugify('Save 2024')).toBe('save-2024')
  })

  it('handles input that is only spaces', () => {
    expect(slugify('   ')).toBe('')
  })

  it('handles long runs of diacritics', () => {
    const result = slugify('Ọlọhun')
    // Should not contain diacritic marks
    expect(result).not.toMatch(/[̣̀-͟]/)
    expect(result.length).toBeGreaterThan(0)
  })
})

// ── generateWeddingSlug — additional edge cases ────────────────
describe('generateWeddingSlug — additional edge cases', () => {
  it('always contains "-and-"', () => {
    expect(generateWeddingSlug('Ana', 'Bob')).toContain('-and-')
  })

  it('handles names that slugify to empty string (graceful)', () => {
    // Both names are all special chars — result will be "-and-"
    const result = generateWeddingSlug('!!!', '???')
    expect(result).toBe('-and-')
  })

  it('handles single-character names', () => {
    expect(generateWeddingSlug('A', 'B')).toBe('a-and-b')
  })
})
