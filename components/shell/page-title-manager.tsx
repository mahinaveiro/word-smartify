'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const SITE_NAME = 'Word Smartify'

function titleForPath(pathname: string) {
  if (pathname === '/') return 'Build your vocabulary'
  if (pathname === '/demo') return 'Try the demo'
  if (pathname === '/iba-english') return 'IBA English vocabulary'
  if (pathname === '/word-smart-1') return 'Word Smart I vocabulary'
  if (pathname === '/word-smart-2') return 'Word Smart II vocabulary'
  if (pathname.startsWith('/auth')) return 'Sign in'
  if (pathname.startsWith('/setup')) return 'Set up your learning plan'
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/learn') return 'Learn'
  if (pathname.startsWith('/learn/level/')) return 'Level'
  if (pathname === '/library') return 'Library'
  if (pathname === '/library/dictionary') return 'Dictionary'
  if (pathname.startsWith('/library/word/')) return 'Word details'
  if (pathname.startsWith('/library/book/')) return 'Book'
  if (pathname.startsWith('/library/level/')) return 'Level'
  if (pathname === '/library/saved') return 'Saved words'
  if (pathname === '/challenge') return 'Daily challenge'
  if (pathname === '/review') return 'Review quiz'
  if (pathname === '/progress') return 'Progress'
  if (pathname === '/mock-tests') return 'Mock tests'
  if (pathname.startsWith('/mock-tests/') && pathname.endsWith('/review')) return 'Mock test review'
  if (pathname.startsWith('/mock-tests/') && pathname.endsWith('/result')) return 'Mock test results'
  if (pathname.startsWith('/mock-tests/')) return 'Mock test'
  if (pathname.startsWith('/session/')) return 'Learning session'
  if (pathname === '/settings') return 'Settings'
  if (pathname === '/profile') return 'Your profile'
  if (pathname.startsWith('/profile/')) return 'Learner profile'
  if (pathname.startsWith('/word/')) return 'Word details'
  return 'Word Smartify'
}

export function PageTitleManager() {
  const pathname = usePathname()

  useEffect(() => {
    document.title = `${titleForPath(pathname)} · ${SITE_NAME}`
  }, [pathname])

  return null
}
