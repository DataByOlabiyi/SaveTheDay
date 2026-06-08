import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const schema = z.object({
  email:            z.string().email(),
  redirectTo:       z.string().url(),
  shouldCreateUser: z.boolean().optional().default(false),
})

function friendlyError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('too many') || lower.includes('over_email')) {
    return 'Too many sign-in attempts for this email. Please wait a few minutes, then try again — or use Google to sign in instantly.'
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate')) {
    return 'Please enter a valid email address.'
  }
  return 'Something went wrong sending the link. Please try again.'
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const ipLimit = await checkRateLimitAsync({ key: `otp:ip:${ip}`, limit: 10, windowMs: 3_600_000 })
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts from your network. Please try again later.' },
      { status: 429 }
    )
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { email, redirectTo, shouldCreateUser } = parsed.data

  const emailLimit = await checkRateLimitAsync({
    key:      `otp:email:${email.toLowerCase()}`,
    limit:    5,
    windowMs: 3_600_000,
  })
  if (!emailLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts for this email. Please wait an hour, then try again — or use Google to sign in.' },
      { status: 429 }
    )
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser },
  })

  if (error) {
    return NextResponse.json({ error: friendlyError(error.message) }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
