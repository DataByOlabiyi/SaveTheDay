// ──────────────────────────────────────────────────────────────
// Binary <-> base64 helpers — edge-runtime safe (no Buffer)
// ──────────────────────────────────────────────────────────────

const CHUNK_SIZE = 8192

// btoa expects a "binary string" (one char per byte); spreading a large
// Uint8Array directly into String.fromCharCode blows the call stack, so
// we build the string in fixed-size chunks instead.
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}
