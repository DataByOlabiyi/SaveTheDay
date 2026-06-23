import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/db/client'
import { adminDeleteUser } from '@/lib/db/admin'
import { sanitizeText } from '@/lib/utils/sanitize'

const schema = z.object({
  account_type:  z.enum(['couple', 'planner']),
  business_name: z.string().max(100).trim().nullable().optional(),
  full_name:     z.string().max(100).trim().optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 422 })
  }

  const admin = createAdminClient()
  const rawBusinessName = parsed.data.business_name ?? null
  const rawFullName = parsed.data.full_name ?? null
  const { error } = await admin
    .from('user_profiles')
    .upsert({
      id:            user.id,
      email:         user.email ?? '',
      account_type:  parsed.data.account_type,
      business_name: rawBusinessName !== null ? sanitizeText(rawBusinessName) : null,
      full_name:     rawFullName !== null ? sanitizeText(rawFullName) : null,
    }, { onConflict: 'id' })

  if (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_profiles')
    .select('account_type, business_name, full_name')
    .eq('id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ account_type: 'couple', business_name: null })
  return NextResponse.json(data)
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await adminDeleteUser(user.id)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({ success: true })
}
