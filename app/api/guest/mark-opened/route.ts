import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'

const schema = z.object({ guestId: z.string().uuid() })

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid guestId' }, { status: 422 })
  }

  const { guestId } = parsed.data
  const supabase = createAdminClient()

  await supabase
    .from('guests')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', guestId)
    .is('opened_at', null) // Only mark once

  return NextResponse.json({ success: true })
}
