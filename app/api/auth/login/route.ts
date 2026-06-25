import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const schema = z.object({
  email:    z.string().email().max(254).toLowerCase(),
  password: z.string().min(1).max(128),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `auth-login:${ip}`, limit: 10, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    // Generic — don't reveal which field failed
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
  }

  const { email, password } = parsed.data

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // Always the same message regardless of whether email or password is wrong
      return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
