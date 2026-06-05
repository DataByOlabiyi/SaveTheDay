import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'

async function assertOwnership(userId: string, weddingId: string): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .eq('user_id', userId)
    .single()
  return !!data
}

// ── GET /api/schedule?weddingId=... ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const weddingId = req.nextUrl.searchParams.get('weddingId')
  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })

  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('event_schedule')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('Schedule GET error:', err)
    return NextResponse.json({ items: [] })
  }
}

// ── POST /api/schedule — create or update an item ────────────────────────────

const itemSchema = z.object({
  weddingId:   z.string().uuid(),
  id:          z.string().uuid().optional(),
  title:       z.string().min(1).max(120),
  time_label:  z.string().min(1).max(40),
  description: z.string().max(300).nullish(),
  location:    z.string().max(120).nullish(),
  emoji:       z.string().max(8).nullish(),
  sort_order:  z.number().int().min(0),
})

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = itemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { weddingId, id, ...fields } = parsed.data
  if (!(await assertOwnership(user.id, weddingId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createAdminClient()

  if (id) {
    const { data, error } = await db
      .from('event_schedule')
      .update({ ...fields })
      .eq('id', id)
      .eq('wedding_id', weddingId)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  }

  const { data, error } = await db
    .from('event_schedule')
    .insert({ wedding_id: weddingId, ...fields })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

// ── DELETE /api/schedule?id=...&weddingId=... ─────────────────────────────────

export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  const weddingId = req.nextUrl.searchParams.get('weddingId')
  if (!id || !weddingId) return NextResponse.json({ error: 'id and weddingId required' }, { status: 400 })

  if (!(await assertOwnership(user.id, weddingId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('event_schedule')
    .delete()
    .eq('id', id)
    .eq('wedding_id', weddingId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
