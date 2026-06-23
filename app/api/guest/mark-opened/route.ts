import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createAdminClient } from '@/lib/db/client'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'

const schema = z.object({
  guestId:   z.string().uuid(),
  weddingId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `mark-opened:${ip}`, limit: 60, windowMs: 60_000 })
  if (!rl.allowed) return NextResponse.json({ ok: true }) // silent — don't reveal rate limit

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid guestId' }, { status: 422 })
  }

  const { guestId, weddingId } = parsed.data
  const supabase = createAdminClient()

  try {
    await supabase
      .from('guests')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', guestId)
      .eq('wedding_id', weddingId)
      .is('opened_at', null) // Only mark once
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Failed to mark opened' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
