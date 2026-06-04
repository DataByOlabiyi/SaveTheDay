import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sanitizeText } from '@/lib/utils/sanitize'

const bodySchema = z.object({
  weddingId: z.string().uuid(),
  guestIds:  z.array(z.string().uuid()).min(1).max(50),
  message:   z.string().max(500).optional(),
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

  const { weddingId, guestIds, message } = parsed.data
  const supabase = createAdminClient()

  // Verify ownership
  const { data: wedding } = await supabase
    .from('weddings')
    .select('id, slug, couple_names, user_id')
    .eq('id', weddingId)
    .eq('user_id', user.id)
    .single()

  if (!wedding) return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })

  // Fetch the target guests
  const { data: guests } = await supabase
    .from('guests')
    .select('id, name, slug, phone, email')
    .eq('wedding_id', weddingId)
    .in('id', guestIds)

  if (!guests?.length) return NextResponse.json({ error: 'No guests found' }, { status: 404 })

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://savetheday.app'
  const coupleName = `${wedding.couple_names.name1} & ${wedding.couple_names.name2}`
  const safeMsg   = message ? sanitizeText(message) : null

  // Mark reminder_sent_at for all targeted guests
  await supabase
    .from('guests')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('wedding_id', weddingId)
    .in('id', guestIds)

  // Build WhatsApp links for each guest (couple will send manually via links)
  const reminderLinks = guests.map(g => {
    const inviteUrl = `${appUrl}/e/${wedding.slug}/${g.slug}`
    const text = safeMsg
      ? `${safeMsg}\n\n${inviteUrl}`
      : `Hi ${g.name}! Just a reminder — you haven't RSVP'd yet for ${coupleName}'s wedding. Open your personal invitation here: ${inviteUrl}`
    return {
      guestId:   g.id,
      guestName: g.name,
      phone:     g.phone,
      waLink:    `https://wa.me/${(g.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`,
      inviteUrl,
    }
  })

  // Email reminders via Resend (if configured)
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const emailGuests = guests.filter(g => g.email)
    for (const g of emailGuests) {
      const inviteUrl = `${appUrl}/e/${wedding.slug}/${g.slug}`
      const subject   = `Reminder: You haven't RSVP'd yet — ${coupleName}`
      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #080C0A; color: #FAF7F2;">
          <p style="color: #C9A84C; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;">Save The Day</p>
          <h2 style="font-size: 22px; margin: 16px 0; font-style: italic;">${coupleName}</h2>
          <p style="color: #999; line-height: 1.6;">
            Hi <strong style="color: #FAF7F2;">${g.name}</strong>,<br><br>
            ${safeMsg ?? `This is a friendly reminder that you haven't RSVP'd yet for our wedding. We'd love to know if you're joining us!`}
          </p>
          <div style="margin: 28px 0;">
            <a href="${inviteUrl}" style="display: inline-block; padding: 14px 28px; background: #C9A84C; color: #080C0A; text-decoration: none; font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase;">
              Open Your Invitation
            </a>
          </div>
          <p style="color: #444; font-size: 11px;">
            This was sent on behalf of ${coupleName}.
          </p>
        </div>
      `
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
        body: JSON.stringify({
          from:    process.env.RESEND_FROM_EMAIL ?? 'notifications@savetheday.app',
          to:      g.email,
          subject,
          html,
        }),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ success: true, links: reminderLinks, count: guests.length })
}
