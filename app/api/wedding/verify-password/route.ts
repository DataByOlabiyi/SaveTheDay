import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getWeddingForPasswordCheck } from '@/lib/db/client'
import { verifyPassword } from '@/lib/utils/password'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const schema = z.object({
  slug:     z.string().min(1).max(200),
  password: z.string().min(1).max(100),
})

// POST /api/wedding/verify-password
// Verifies a guest's password for a private wedding. Rate-limited to prevent brute-force.
export async function POST(req: NextRequest): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `pwd-verify:${ip}`, limit: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 422 })
  }

  const { slug, password } = parsed.data
  const wedding = await getWeddingForPasswordCheck(slug)

  // Return the same response whether the wedding doesn't exist or the password is wrong
  // to avoid leaking which slugs are private.
  if (!wedding?.config?.is_private || !wedding.config.privacy_password_hash) {
    return NextResponse.json({ valid: false }, { status: 200 })
  }

  const valid = await verifyPassword(password, wedding.config.privacy_password_hash)
  return NextResponse.json({ valid }, { status: 200 })
}
