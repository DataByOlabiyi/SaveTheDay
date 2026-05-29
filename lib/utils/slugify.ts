/**
 * Convert a display name to a URL-safe slug.
 * e.g. "Temi Johnson"  → "temi-johnson"
 *      "Adéọlá Bámidélé" → "adeola-bamidele"
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric
    .trim()
    .replace(/\s+/g, '-')            // spaces → dashes
    .replace(/-+/g, '-')             // collapse multiple dashes
    .replace(/^-|-$/g, '')           // trim leading/trailing dashes
}

/**
 * Generate a wedding URL slug from both partners' first names.
 * e.g. "Mojirade", "Olabiyi" → "mojirade-and-olabiyi"
 */
export function generateWeddingSlug(name1: string, name2: string): string {
  return `${slugify(name1)}-and-${slugify(name2)}`
}

/**
 * Generate a unique holding slug for a new wedding before names are known.
 * e.g. year=2026 → "wedding-2026-x7k2"
 * Couples replace this via the admin once they enter their names.
 */
export function generateInitialWeddingSlug(year: number): string {
  const shortId = Math.random().toString(36).slice(2, 6)
  return `wedding-${year}-${shortId}`
}
