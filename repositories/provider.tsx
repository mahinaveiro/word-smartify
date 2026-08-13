'use client'

/**
 * React access to the repository layer. Components use `useRepositories()`
 * instead of importing implementations, keeping UI decoupled from storage.
 */

import { createContext, useContext, type ReactNode } from 'react'
import type { Repositories } from './interfaces'
import { repositories } from './index'
import { CURRENT_USER_ID } from '@/data/local-store'

interface RepoContextValue {
  repositories: Repositories
  userId: string
}

const RepoContext = createContext<RepoContextValue>({
  repositories,
  userId: CURRENT_USER_ID,
})

export function RepositoryProvider({ children }: { children: ReactNode }) {
  return (
    <RepoContext.Provider value={{ repositories, userId: CURRENT_USER_ID }}>
      {children}
    </RepoContext.Provider>
  )
}

export function useRepositories(): Repositories {
  return useContext(RepoContext).repositories
}

export function useCurrentUserId(): string {
  return useContext(RepoContext).userId
}
