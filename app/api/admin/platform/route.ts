import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { getPlatformStats } from '@/lib/db/admin'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const stats = await getPlatformStats()
    return NextResponse.json({ stats })
  } catch (err) {
    console.error('Platform stats error:', err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
