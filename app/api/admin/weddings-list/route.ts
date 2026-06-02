import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { getAllWeddings, adminDeleteWedding, writeAuditLog } from '@/lib/db/admin'
import { updateWeddingStatus } from '@/lib/db/client'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page   = parseInt(req.nextUrl.searchParams.get('page')   ?? '0')
  const search = req.nextUrl.searchParams.get('search') ?? ''

  const result = await getAllWeddings(page, 50, search)
  return NextResponse.json(result)
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const weddingId = req.nextUrl.searchParams.get('weddingId')
  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })

  const result = await adminDeleteWedding(weddingId)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  await writeAuditLog({
    admin_id: admin.id, admin_email: admin.email,
    action: 'delete_wedding', resource_type: 'wedding', resource_id: weddingId,
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { weddingId, status } = await req.json()
  if (!weddingId || !status) return NextResponse.json({ error: 'weddingId and status required' }, { status: 400 })

  const result = await updateWeddingStatus(weddingId, status)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  await writeAuditLog({
    admin_id: admin.id, admin_email: admin.email,
    action: `set_status_${status}`, resource_type: 'wedding', resource_id: weddingId,
  })

  return NextResponse.json({ success: true })
}
