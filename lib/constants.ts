// ──────────────────────────────────────────────────────────────
// Shared constants — used across API routes and client components
// ──────────────────────────────────────────────────────────────

/** Hard cap on gallery photos per wedding */
export const MAX_GALLERY_PHOTOS = 50

/** Max upload size for the OG share-preview cover photo */
export const OG_IMAGE_MAX_SIZE_BYTES = 8 * 1024 * 1024

/** Accepted MIME types for the OG share-preview cover photo */
export const OG_IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
