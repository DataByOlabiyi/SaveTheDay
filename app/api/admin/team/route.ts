import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { getTeamMembers, setUserRole, writeAuditLog } from '@/lib/db/admin'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const db = createAdminClient()

  // Find user profile by email
  const { data: profile, error } = await db
    .from('user_profiles')
    .select('id, email, role')
    .eq('email', email.trim().toLowerCase())
    .single()

  if (error || !profile) {
    return NextResponse.json(
      { error: 'No account found with that email. Ask them to sign up first.' },
      { status: 404 }
    )
  }

  if (profile.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot modify super_admin role' }, { status: 400 })
  }

  const result = await setUserRole(profile.id, 'admin')
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

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

  const result = await setUserRole(userId, 'user')
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  await writeAuditLog({
    admin_id: admin.id, admin_email: admin.email,
    action: 'remove_admin', resource_type: 'user', resource_id: userId,
  })

  return NextResponse.json({ success: true })
}
