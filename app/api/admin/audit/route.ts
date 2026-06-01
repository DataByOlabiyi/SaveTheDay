import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { getAuditLog } from '@/lib/db/admin'

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '0')
  const result = await getAuditLog(page, 50)
  return NextResponse.json(result)
}
