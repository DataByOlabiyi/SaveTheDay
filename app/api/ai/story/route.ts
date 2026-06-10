import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimitAsync } from '@/lib/utils/rateLimit'
import { sanitizeText } from '@/lib/utils/sanitize'
import Anthropic from '@anthropic-ai/sdk'

const requestSchema = z.object({
  weddingId:  z.string().uuid(),
  keywords:   z.string().max(300).optional(),
})

export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 5 AI generations per hour per IP (AI calls are expensive)
  const ip = request.headers.get('x-forwarded-for') ?? '0.0.0.0'
  const rl  = await checkRateLimitAsync({ key: `ai:story:${ip}`, limit: 5, windowMs: 60 * 60_000 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait before generating again.' }, { status: 429 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI generation is not configured' }, { status: 503 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 })
  }

  const { weddingId, keywords } = parsed.data

  // Fetch wedding and verify ownership
  const db = createAdminClient()
  const { data: wedding, error: weddingError } = await db
    .from('weddings')
    .select('couple_names, user_id')
    .eq('id', weddingId)
    .single()

  if (weddingError || !wedding) {
    return NextResponse.json({ error: 'Wedding not found' }, { status: 404 })
  }

  if (wedding.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const name1 = sanitizeText(wedding.couple_names.name1)
  const name2 = sanitizeText(wedding.couple_names.name2)
  const safeKeywords = keywords ? sanitizeText(keywords) : ''

  const client = new Anthropic({ apiKey })

  const prompt = `You are helping a couple create beautiful story milestones for their digital wedding invitation.

Couple: ${name1} and ${name2}
${safeKeywords ? `Additional context: ${safeKeywords}` : ''}

Generate exactly 5 romantic love story milestones in JSON format. Each milestone should be a different chapter of their love story (e.g. how they met, first date, a memorable trip, the proposal, celebrating their future).

Write descriptions in second person ("They met at…" / "${name1} and ${name2} found themselves…") — warm, personal, cinematic. Each description should be 2-3 sentences.

Return ONLY a JSON array with no markdown, no code block:
[
  {
    "title": "Chapter title",
    "emoji": "single emoji",
    "date_label": "Season or Year (e.g. Summer 2019)",
    "description": "2-3 sentence warm description"
  }
]`

  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }, {
      timeout: 8000, // 8s — safely under Vercel's 10s function limit
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    // Strip any accidental markdown code fences
    const jsonText = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

    let milestones: { title: string; emoji: string; date_label: string; description: string }[]
    try {
      milestones = JSON.parse(jsonText)
    } catch {
      console.error('[ai/story] Failed to parse AI response:', raw)
      return NextResponse.json({ error: 'AI returned an unexpected format. Please try again.' }, { status: 502 })
    }

    if (!Array.isArray(milestones) || milestones.length === 0) {
      return NextResponse.json({ error: 'AI returned an empty response. Please try again.' }, { status: 502 })
    }

    // Sanitize AI output before returning
    const safe = milestones.slice(0, 5).map((m, i) => ({
      title:       sanitizeText(String(m.title ?? '')).slice(0, 100),
      emoji:       sanitizeText(String(m.emoji ?? '')).slice(0, 8),
      date_label:  sanitizeText(String(m.date_label ?? '')).slice(0, 50),
      description: sanitizeText(String(m.description ?? '')).slice(0, 1000),
      sort_order:  i + 1,
    }))

    return NextResponse.json({ milestones: safe })
  } catch (err) {
    console.error('[ai/story] Anthropic error:', err)
    return NextResponse.json({ error: 'AI generation failed. Please try again.' }, { status: 502 })
  }
}
