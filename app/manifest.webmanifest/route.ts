import type { NextRequest } from 'next'

export function GET(_req: NextRequest) {
  const manifest = {
    name: 'Word Smartify — Vocabulary Learning for IBA English',
    short_name: 'Word Smartify',
    description:
      'Learn Word Smart vocabulary with mnemonics, active recall, spaced review, quizzes, and mock tests for stronger English vocabulary.',
    id: '/',
    start_url: '/dashboard?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f4f1e9',
    theme_color: '#f4f1e9',
    categories: ['education', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
    screenshots: [
      {
        src: '/screenshot-mobile.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Word Smartify vocabulary learning on mobile',
      },
      {
        src: '/screenshot-desktop.png',
        sizes: '1280x800',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Word Smartify vocabulary learning on desktop',
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
