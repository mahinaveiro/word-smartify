import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, DM_Sans, Noto_Sans_Bengali } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { RepositoryProvider } from '@/repositories/provider'
import { AuthProvider } from '@/features/auth/auth-provider'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// Bangla meanings are rendered with lang="bn" throughout the app (word detail,
// flashcards). Neither Space Grotesk nor DM Sans includes Bengali glyphs, so
// without this the script renders as tofu boxes. This is a functional font,
// not a design choice — it's only ever applied to Bangla-script text.
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
  variable: '--font-noto-bengali',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Word Smartify — Learn vocabulary, word by word',
  description:
    'A mobile-first vocabulary trainer. Master 1,888 words across Word Smart I & II with spaced review, quizzes, streaks, and mock tests.',
  generator: 'v0.app',
  applicationName: 'Word Smartify',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Word Smartify',
  },
  icons: {
    icon: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f1e9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${notoSansBengali.variable} bg-background`}
    >
      <body className="min-h-dvh antialiased">
        <RepositoryProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </RepositoryProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
