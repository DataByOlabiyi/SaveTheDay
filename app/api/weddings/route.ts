import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createWedding, upsertUserProfile } from '@/lib/db/client'
import { sanitizeText } from '@/lib/utils/sanitize'

const schema = z.object({
  name1:        z.string().min(1).max(60).trim(),
  name2:        z.string().min(1).max(60).trim(),
  wedding_date: z.string().min(1),
  venue:        z.string().min(1).max(200).trim(),
  city:         z.string().max(100).trim().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  // Ensure the user profile exists
  await upsertUserProfile(user.id, user.email ?? '')

  const { wedding, error } = await createWedding(user.id, {
    name1: sanitizeText(parsed.data.name1),
    name2: sanitizeText(parsed.data.name2),
    wedding_date: parsed.data.wedding_date,
    venue: sanitizeText(parsed.data.venue),
    city: parsed.data.city !== undefined ? sanitizeText(parsed.data.city) : undefined,
  })

  if (error || !wedding) {
    Sentry.captureException(new Error(error ?? 'Failed to create wedding'))
    return NextResponse.json({ error: error ?? 'Failed to create wedding' }, { status: 500 })
  }

  return NextResponse.json({ slug: wedding.slug, id: wedding.id }, { status: 201 })
}
