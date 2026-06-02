import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAnalyticsSummary } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weddingId = req.nextUrl.searchParams.get('weddingId')
  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })

  // Verify ownership
  const db = createAdminClient()
  const { data: wedding } = await db
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!wedding) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const summary = await getAnalyticsSummary(weddingId)
    return NextResponse.json({ summary })
  } catch (err) {
    console.error('Analytics GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
