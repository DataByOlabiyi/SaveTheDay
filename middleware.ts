import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // ── Supabase session refresh ───────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Protect /studio, /create, /account (must be logged in) ────
  if (
    pathname.startsWith('/studio') ||
    pathname.startsWith('/create') ||
    pathname.startsWith('/account')
  ) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Protect /admin (must be admin or super_admin) ──────────────
  if (pathname.startsWith('/admin')) {
    if (!user) {
      // Return 404 — never reveal the admin route exists to unauthenticated users
      return new NextResponse(null, { status: 404 })
    }

    // Check role from user_profiles via service role
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey) {
      const { createClient } = await import('@supabase/supabase-js')
      const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: profile } = await adminDb
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role ?? 'user'
      if (role !== 'admin' && role !== 'super_admin') {
        return new NextResponse(null, { status: 404 })
      }
    } else {
      // No service key — block admin access in misconfigured environments
      return new NextResponse(null, { status: 404 })
    }
  }

  // ── Redirect logged-in users away from auth pages ─────────────
  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/studio', request.url))
  }

  // ── Security headers ──────────────────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
