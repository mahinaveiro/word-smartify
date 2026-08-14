'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Repositories } from './interfaces'
import { repositories } from './index'
import { useAuth } from '@/features/auth/auth-provider'

interface RepoContextValue {
  repositories: Repositories
  userId: string | null
}

const RepoContext = createContext<RepoContextValue>({
  repositories,
  userId: null,
})

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return (
    <RepoContext.Provider value={{ repositories, userId: user?.id ?? null }}>
      {children}
    </RepoContext.Provider>
  )
}

export function useRepositories(): Repositories {
  return useContext(RepoContext).repositories
}

export function useCurrentUserId(): string {
  const userId = useContext(RepoContext).userId
  if (!userId) throw new Error('A signed-in user is required for this operation.')
  return userId
}
