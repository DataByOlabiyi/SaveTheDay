import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const schema = z.object({
  email:      z.string().email().max(254).toLowerCase(),
  redirectTo: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `auth-reset:${ip}`, limit: 3, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try { body = await request.json() } catch {
    // Return success regardless — never confirm whether an email is registered
    return NextResponse.json({ success: true })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    // Return success regardless — prevents enumeration via validation failures
    return NextResponse.json({ success: true })
  }

  const { email, redirectTo } = parsed.data

  const supabase = await createSupabaseServerClient()
  // Fire-and-forget: result is intentionally ignored so the response is
  // identical whether the email exists or not.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  return NextResponse.json({ success: true })
}
