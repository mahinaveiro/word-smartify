import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, DM_Sans, Noto_Sans_Bengali } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { RepositoryProvider } from '@/repositories/provider'
import { AuthProvider } from '@/features/auth/auth-provider'
import { PageTitleManager } from '@/components/shell/page-title-manager'
import { InstallPrompt } from '@/features/setup/install-prompt'

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

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
  variable: '--font-noto-bengali',
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://word-smartify.vercel.app'
const socialImageUrl = new URL('/og-image.jpg', siteUrl).toString()
const siteDescription =
  'Master Word Smart and IBA English vocabulary with mnemonics, quizzes, spaced review, and mock tests.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Word Smartify | Vocabulary Learning for IBA English',
    template: '%s | Word Smartify',
  },
  description: siteDescription,
  applicationName: 'Word Smartify',
  generator: 'Next.js',
  creator: 'Word Smartify',
  publisher: 'Word Smartify',
  category: 'education',
  keywords: [
    'Word Smart',
    'Word Smart I',
    'Word Smart II',
    'IBA English vocabulary',
    'IBA admission vocabulary',
    'English vocabulary builder',
    'vocabulary learning app',
    'English word meanings',
    'vocabulary quiz',
    'mnemonics for vocabulary',
    'spaced repetition vocabulary',
    'mock test vocabulary practice',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Word Smartify',
    title: 'Word Smartify | Learn vocabulary. Recall faster.',
    description: siteDescription,
    locale: 'en_US',
    images: [
      {
        url: socialImageUrl,
        secureUrl: socialImageUrl,
        type: 'image/jpeg',
        width: 1200,
        height: 630,
        alt: 'Word Smartify vocabulary learning app with a Start Learning call to action',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word Smartify | Vocabulary Learning for IBA English',
    description: siteDescription,
    images: [socialImageUrl],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Word Smartify',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
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
        <PageTitleManager />
        <InstallPrompt />
        <AuthProvider>
          <RepositoryProvider>
            <ToastProvider>{children}</ToastProvider>
          </RepositoryProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
