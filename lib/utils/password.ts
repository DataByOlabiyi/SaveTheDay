import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

const KEYLEN = 64
const SEP    = '.'

/** Hash a plaintext password using scrypt. Returns `<hash>.<salt>` (hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const buf  = (await scryptAsync(password, salt, KEYLEN)) as Buffer
  return `${buf.toString('hex')}${SEP}${salt}`
}

/**
 * Verify a plaintext password against a stored `<hash>.<salt>` string.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const sepIdx = stored.lastIndexOf(SEP)
  if (sepIdx === -1) return false
  const hash = stored.slice(0, sepIdx)
  const salt = stored.slice(sepIdx + 1)
  try {
    const buf     = (await scryptAsync(password, salt, KEYLEN)) as Buffer
    const hashBuf = Buffer.from(hash, 'hex')
    if (buf.length !== hashBuf.length) return false
    return timingSafeEqual(buf, hashBuf)
  } catch {
    return false
  }
}
