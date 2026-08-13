import type { NextRequest } from 'next/server'

// Served as /manifest.webmanifest — Word Smartify is an installable PWA.
export function GET(_req: NextRequest) {
  const manifest = {
    name: 'Word Smartify',
    short_name: 'Smartify',
    description:
      'Master 1,888 words across Word Smart I & II with spaced review, quizzes, streaks, and mock tests.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f1e9',
    theme_color: '#f4f1e9',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
