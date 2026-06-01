import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://savetheday.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/signup', '/login', '/e/demo-wedding', '/terms', '/privacy'],
        // Keep guest invitations, admin pages, and API routes private
        disallow: ['/studio', '/dashboard', '/create', '/admin', '/account', '/api/', '/w/', '/auth/'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
