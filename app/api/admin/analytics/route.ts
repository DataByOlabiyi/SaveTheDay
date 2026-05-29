import { NextRequest, NextResponse } from 'next/server'
import { getAnalyticsSummary } from '@/lib/db/client'

// GET /api/admin/analytics?weddingId=...&secret=...
export async function GET(req: NextRequest) {
  const weddingId = req.nextUrl.searchParams.get('weddingId')
  const secret    = req.nextUrl.searchParams.get('secret')

  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await getAnalyticsSummary(weddingId)
    return NextResponse.json({ summary })
  } catch (err) {
    console.error('Analytics GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
