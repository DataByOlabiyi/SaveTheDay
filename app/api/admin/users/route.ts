import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { getAllUsers, adminDeleteUser, writeAuditLog } from '@/lib/db/admin'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page   = parseInt(req.nextUrl.searchParams.get('page')   ?? '0')
  const search = req.nextUrl.searchParams.get('search') ?? ''

  const result = await getAllUsers(page, 50, search)
  return NextResponse.json(result)
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin('super_admin')
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Prevent self-deletion
  if (userId === admin.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const result = await adminDeleteUser(userId)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  await writeAuditLog({
    admin_id: admin.id, admin_email: admin.email,
    action: 'delete_user', resource_type: 'user', resource_id: userId,
  })

  return NextResponse.json({ success: true })
}
