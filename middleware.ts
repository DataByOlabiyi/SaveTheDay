import { NextRequest, NextResponse } from 'next/server'

/**
 * Edge middleware — runs at CDN level before the page renders.
 *
 * Responsibilities:
 * 1. Inject guest name into response headers for fast personalization
 * 2. Block admin routes without the correct secret
 * 3. Add security headers
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Security: block direct access to admin without secret ──
  if (pathname.startsWith('/admin')) {
    const secret = request.nextUrl.searchParams.get('secret')
    const expectedSecret = process.env.ADMIN_SECRET

    if (!expectedSecret || secret !== expectedSecret) {
      // Don't reveal the admin exists — return a plain 404 style response
      return new NextResponse('Not found', { status: 404 })
    }
  }

  // ── Continue with security headers ──
  const response = NextResponse.next()

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

export const config = {
  // Only run middleware on these paths — not on static assets or API
  matcher: [
    '/admin/:path*',
    '/:weddingSlug/:guestSlug*',
  ],
}
