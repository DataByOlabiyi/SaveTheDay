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
