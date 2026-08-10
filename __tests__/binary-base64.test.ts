import { describe, it, expect } from 'vitest'
import { arrayBufferToBase64 } from '@/lib/utils/binary'

function bufferFrom(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

function decodeToBytes(base64: string): number[] {
  const binary = atob(base64)
  const bytes: number[] = []
  for (let i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i))
  return bytes
}

describe('arrayBufferToBase64', () => {
  it('returns an empty string for an empty buffer', () => {
    expect(arrayBufferToBase64(new ArrayBuffer(0))).toBe('')
  })

  it('matches a hand-computed base64 string for a small known buffer', () => {
    // "Hello" -> [72, 101, 108, 108, 111]
    const buffer = bufferFrom([72, 101, 108, 108, 111])
    expect(arrayBufferToBase64(buffer)).toBe('SGVsbG8=')
  })

  it('handles buffers larger than the internal chunk size without corruption', () => {
    // Chunk size is 8192 bytes — use a size that straddles two chunk boundaries.
    const size = 8192 * 2 + 37
    const bytes = Array.from({ length: size }, (_, i) => i % 256)
    const buffer = bufferFrom(bytes)

    const result = arrayBufferToBase64(buffer)
    const decoded = decodeToBytes(result)

    expect(decoded).toEqual(bytes)
  })

  it('round-trips arbitrary bytes through atob without corruption', () => {
    const bytes = [0, 1, 2, 253, 254, 255, 16, 32, 64, 128, 200]
    const buffer = bufferFrom(bytes)

    const result = arrayBufferToBase64(buffer)
    const decoded = decodeToBytes(result)

    expect(decoded).toEqual(bytes)
  })
})
