import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://word-smartify.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/demo', '/auth', '/iba-english', '/word-smart-1', '/word-smart-2'],
        disallow: [
          '/dashboard',
          '/learn',
          '/library',
          '/progress',
          '/leaderboard',
          '/mock-tests',
          '/profile',
          '/settings',
          '/setup',
          '/session',
          '/review',
          '/challenge',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
