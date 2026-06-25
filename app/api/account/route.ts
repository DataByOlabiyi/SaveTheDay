import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/db/client'
import { adminDeleteUser } from '@/lib/db/admin'
import { sanitizeText } from '@/lib/utils/sanitize'

const patchSchema = z.object({
  account_type:  z.enum(['couple', 'planner']),
  business_name: z.string().max(100).trim().nullable().optional(),
  full_name:     z.string().max(100).trim().optional(),
})

const deleteSchema = z.object({
  password: z.string().min(1).max(128).optional(),
})

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
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
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
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

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    body = {}
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 422 })
  }

  // Users who signed up with email+password must confirm their password before deletion.
  // OAuth-only users (no email identity) are allowed through with session auth alone.
  const hasPasswordAuth = user.identities?.some(id => id.provider === 'email') ?? false

  if (hasPasswordAuth) {
    if (!parsed.data.password) {
      return NextResponse.json({ error: 'Password required to delete account', requiresPassword: true }, { status: 403 })
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    user.email!,
      password: parsed.data.password,
    })
    if (signInError) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 403 })
    }
  }

  const result = await adminDeleteUser(user.id)
  if (!result.success) {
    Sentry.captureException(new Error(String(result.error)))
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
