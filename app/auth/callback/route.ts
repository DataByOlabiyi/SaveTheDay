import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServerAdminClient } from '@/lib/supabase/server'
import { safeRedirectPath } from '@/lib/utils/redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = safeRedirectPath(searchParams.get('next')) || '/studio'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Password reset flow — send to the set-new-password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }

      const admin = await createSupabaseServerAdminClient()

      // Upsert user profile so the dashboard can look up their weddings
      try {
        await admin.from('user_profiles').upsert({
          id:        data.user.id,
          email:     data.user.email ?? '',
          full_name: data.user.user_metadata?.full_name ?? null,
        }, { onConflict: 'id' })
      } catch {
        // Non-fatal — profile will be created on next dashboard visit
      }

      // Route to the correct area based on role when no specific destination is set
      let destination = next
      if (next === '/studio' || next === '/admin') {
        try {
          const { data: profile } = await admin
            .from('user_profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()
          const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
          destination = isAdmin ? '/admin' : '/studio'
        } catch {
          destination = next
        }
      }

      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
