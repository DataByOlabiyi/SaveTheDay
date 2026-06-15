import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = await createSupabaseServerAdminClient()
  try {
    await admin.from('user_profiles').upsert({
      id:        user.id,
      email:     user.email ?? '',
      full_name: user.user_metadata?.full_name ?? null,
    }, { onConflict: 'id' })
  } catch {
    // Non-fatal
  }

  return NextResponse.json({ ok: true })
}
