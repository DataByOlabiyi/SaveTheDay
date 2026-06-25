import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { getTeamMembers, setUserRole, writeAuditLog } from '@/lib/db/admin'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const postBodySchema = z.object({
  email: z.string().email(),
})

// GET /api/admin/team — list all admin/super_admin members
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await getTeamMembers()
  return NextResponse.json({ members })
}

// POST /api/admin/team — invite a user by email (set role to admin)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin('super_admin')
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = postBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { email } = parsed.data

  const db = createAdminClient()

  // Find user profile by email
  const { data: profile, error } = await db
    .from('user_profiles')
    .select('id, email, role')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (error || !profile) {
    return NextResponse.json(
      { error: 'Could not find an account for that email address.' },
      { status: 404 }
    )
  }

  if (profile.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot modify super_admin role' }, { status: 400 })
  }

  const result = await setUserRole(profile.id, 'admin')
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  await db.from('user_profiles').update({ account_type: 'staff' }).eq('id', profile.id)

  await writeAuditLog({
    admin_id: admin.id, admin_email: admin.email,
    action: 'promote_to_admin', resource_type: 'user', resource_id: profile.id,
    details: { target_email: email },
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/team?userId=... — remove admin access (set role to user)
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin('super_admin')
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  if (userId === admin.id) {
    return NextResponse.json({ error: 'Cannot remove your own admin access' }, { status: 400 })
  }

  const db = createAdminClient()

  // Prevent orphaning — ensure at least one other super_admin will remain
  const { count } = await db
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .neq('id', userId)

  if (count === 0) {
    return NextResponse.json({ error: 'Cannot remove the last super admin' }, { status: 400 })
  }

  const result = await setUserRole(userId, 'user')
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  await db.from('user_profiles').update({ account_type: 'couple' }).eq('id', userId)

  await writeAuditLog({
    admin_id: admin.id, admin_email: admin.email,
    action: 'remove_admin', resource_type: 'user', resource_id: userId,
  })

  return NextResponse.json({ success: true })
}
