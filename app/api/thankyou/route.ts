import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sanitizeText } from '@/lib/utils/sanitize'

const bodySchema = z.object({
  weddingId:   z.string().uuid(),
  message:     z.string().min(1).max(1000),
  galleryUrl:  z.string().url().optional().or(z.literal('')),
  targetAll:   z.boolean().default(true),
  guestIds:    z.array(z.string().uuid()).max(500).optional(),
})

export async function POST(request: NextRequest): Promise<Response> {
  const authClient = await createSupabaseServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 422 })
  }

  const { weddingId, message, galleryUrl, targetAll, guestIds } = parsed.data
  const supabase = createAdminClient()

  // Verify ownership
  const { data: wedding } = await supabase
    .from('weddings')
    .select('id, slug, couple_names, user_id')
    .eq('id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!wedding) return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })

  const coupleName = `${wedding.couple_names.name1} & ${wedding.couple_names.name2}`
  const safeMsg    = sanitizeText(message)

  // Fetch guests
  let query = supabase
    .from('guests')
    .select('id, name, slug, phone, email')
    .eq('wedding_id', weddingId)

  if (!targetAll && guestIds?.length) {
    query = query.in('id', guestIds)
  }

  const { data: guests } = await query
  if (!guests?.length) return NextResponse.json({ error: 'No guests found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://savetheday.app'

  // Mark thankyou_sent_at
  const targetIds = guests.map(g => g.id)
  await supabase
    .from('guests')
    .update({ thankyou_sent_at: new Date().toISOString() })
    .eq('wedding_id', weddingId)
    .in('id', targetIds)

  // Build WhatsApp links (couple sends these manually)
  const waLinks = guests.map(g => {
    const parts = [safeMsg]
    if (galleryUrl) parts.push(`\nView our gallery: ${galleryUrl}`)
    const text = parts.join('')
    return {
      guestId:   g.id,
      guestName: g.name,
      phone:     g.phone,
      waLink:    `https://wa.me/${(g.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`,
    }
  })

  // Email via Resend (if configured)
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const emailGuests = guests.filter(g => g.email)
    for (const g of emailGuests) {
      const gallerySection = galleryUrl
        ? `<div style="margin: 20px 0;"><a href="${galleryUrl}" style="display: inline-block; padding: 12px 24px; background: rgba(201,168,76,0.15); color: #C9A84C; text-decoration: none; border: 1px solid rgba(201,168,76,0.3); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;">View Our Gallery →</a></div>`
        : ''
      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #080C0A; color: #FAF7F2;">
          <p style="color: #C9A84C; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;">Save The Day</p>
          <h2 style="font-size: 22px; margin: 16px 0; font-style: italic;">${coupleName}</h2>
          <p style="color: #999; line-height: 1.8; font-size: 15px;">
            Dear <strong style="color: #FAF7F2;">${g.name}</strong>,<br><br>
            ${safeMsg.replace(/\n/g, '<br>')}
          </p>
          ${gallerySection}
          <p style="color: #555; font-size: 11px; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
            With love, ${coupleName}
          </p>
        </div>
      `
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
        body: JSON.stringify({
          from:    process.env.RESEND_FROM_EMAIL ?? 'notifications@savetheday.app',
          to:      g.email,
          subject: `Thank you from ${coupleName}`,
          html,
        }),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ success: true, links: waLinks, count: guests.length })
}
