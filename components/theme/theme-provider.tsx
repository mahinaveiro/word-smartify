'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useSWRConfig } from 'swr'
import { useAuth } from '@/features/auth/auth-provider'
import { useProfile } from '@/hooks/use-data'
import { useActions } from '@/hooks/use-actions'
import { useToast } from '@/components/ui/toast'
import type { ThemePreference } from '@/types/database'

const LAST_THEME_STORAGE_KEY = 'word-smartify:theme:last'
const USER_THEME_STORAGE_PREFIX = 'word-smartify:theme:user:'
const LIGHT_THEME_COLOR = '#f4f1e9'
const DARK_THEME_COLOR = '#080c0b'

interface ThemeContextValue {
  theme: ThemePreference
  toggleTheme: () => Promise<void>
  isSaving: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function normalizeTheme(value: unknown): ThemePreference {
  return value === 'dark' ? 'dark' : 'light'
}

function readStorage(key: string): ThemePreference | null {
  try {
    if (typeof window === 'undefined') return null
    const value = window.localStorage.getItem(key)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

function writeStorage(key: string, theme: ThemePreference) {
  try {
    window.localStorage.setItem(key, theme)
  } catch {
    // Theme persistence remains authoritative in Supabase when local storage is unavailable.
  }
}

function userThemeStorageKey(userId: string) {
  return `${USER_THEME_STORAGE_PREFIX}${userId}`
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement
  const isDark = theme === 'dark'
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const { updateProfile } = useActions()
  const { mutate } = useSWRConfig()
  const { toast } = useToast()
  const [optimisticTheme, setOptimisticTheme] = useState<{ userId: string; theme: ThemePreference } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const userId = user?.id ?? null
  const profileTheme = profile ? normalizeTheme(profile.theme_preference) : null
  const cachedTheme = userId ? readStorage(userThemeStorageKey(userId)) : null
  const persistedTheme = profileTheme ?? cachedTheme ?? 'light'
  const theme = optimisticTheme?.userId === userId ? optimisticTheme.theme : persistedTheme

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!user || !profile) return

    const profileTheme = normalizeTheme(profile.theme_preference)
    writeStorage(LAST_THEME_STORAGE_KEY, profileTheme)
    writeStorage(userThemeStorageKey(user.id), profileTheme)
  }, [profile, user])

  const toggleTheme = useCallback(async () => {
    if (!user || isSaving) return

    const previousTheme = theme
    const nextTheme: ThemePreference = theme === 'dark' ? 'light' : 'dark'
    setOptimisticTheme({ userId: user.id, theme: nextTheme })
    writeStorage(LAST_THEME_STORAGE_KEY, nextTheme)
    writeStorage(userThemeStorageKey(user.id), nextTheme)
    setIsSaving(true)

    try {
      const updatedProfile = await updateProfile({ theme_preference: nextTheme })
      await mutate(['profile', user.id], updatedProfile, false)
    } catch {
      setOptimisticTheme({ userId: user.id, theme: previousTheme })
      writeStorage(LAST_THEME_STORAGE_KEY, previousTheme)
      writeStorage(userThemeStorageKey(user.id), previousTheme)
      toast({
        title: 'Theme change was not saved',
        description: 'Your previous appearance has been restored. Please try again.',
        tone: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, mutate, theme, toast, updateProfile, user])

  const value = useMemo(() => ({ theme, toggleTheme, isSaving }), [isSaving, theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
