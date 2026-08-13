import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://savetheday.app'

  return {
    rules: [
      {
        userAgent: '*',
        // /api/og must stay crawlable — it's the share-preview image WhatsApp/iMessage
        // fetch to unfurl invite links, and not every link-preview bot ignores robots.txt
        // the way Facebook's crawler does.
        allow: ['/', '/signup', '/login', '/e/demo-wedding', '/terms', '/privacy', '/api/og'],
        // Keep guest invitations, admin pages, and API routes private
        disallow: ['/studio', '/dashboard', '/create', '/admin', '/account', '/api/', '/w/', '/auth/'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
