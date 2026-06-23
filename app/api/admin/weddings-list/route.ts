import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'
import { requireAdmin } from '@/lib/utils/adminAuth'
import { getAllWeddings, adminDeleteWedding, writeAuditLog } from '@/lib/db/admin'
import { updateWeddingStatus, createAdminClient } from '@/lib/db/client'

const patchBodySchema = z.object({
  weddingId: z.string().uuid(),
  status: z.enum(['draft', 'ready', 'published']),
})

export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const page   = parseInt(req.nextUrl.searchParams.get('page')   ?? '0')
  const search = req.nextUrl.searchParams.get('search') ?? ''

  const result = await getAllWeddings(page, 50, search)
  return NextResponse.json(result)
}

export async function DELETE(req: NextRequest) {
  // Wedding deletion is irreversible — require super_admin (same bar as user deletion)
  const admin = await requireAdmin('super_admin')
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const weddingId = req.nextUrl.searchParams.get('weddingId')
  if (!weddingId) return NextResponse.json({ error: 'weddingId required' }, { status: 400 })

  // Capture wedding details before deletion so the audit log is meaningful
  const db = createAdminClient()
  const { data: weddingSnapshot } = await db
    .from('weddings')
    .select('slug, couple_names, user_id, status')
    .eq('id', weddingId)
    .single()

  let ownerEmail: string | undefined
  if (weddingSnapshot?.user_id) {
    const { data: profile } = await db
      .from('user_profiles')
      .select('email')
      .eq('id', weddingSnapshot.user_id)
      .single()
    ownerEmail = profile?.email
  }

  const result = await adminDeleteWedding(weddingId)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  await writeAuditLog({
    admin_id: admin.id, admin_email: admin.email,
    action: 'delete_wedding', resource_type: 'wedding', resource_id: weddingId,
    details: {
      slug:         weddingSnapshot?.slug,
      couple_names: weddingSnapshot?.couple_names,
      owner_email:  ownerEmail,
      status:       weddingSnapshot?.status,
    },
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch (err) {
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, status } = parsed.data

  const result = await updateWeddingStatus(weddingId, status)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  await writeAuditLog({
    admin_id: admin.id, admin_email: admin.email,
    action: `set_status_${status}`, resource_type: 'wedding', resource_id: weddingId,
  })

  return NextResponse.json({ success: true })
}
