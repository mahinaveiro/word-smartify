import type { Repositories } from '@/repositories/interfaces'

const STORAGE_KEY = 'word-smartify:dev-fault'

interface DevFault {
  operation: string
  mode: 'error' | 'delay' | 'empty'
  delayMs?: number
}

function readFault(): DevFault | null {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('operation' in parsed) ||
      typeof parsed.operation !== 'string' ||
      !('mode' in parsed) ||
      (parsed.mode !== 'error' && parsed.mode !== 'delay' && parsed.mode !== 'empty')
    ) {
      return null
    }

    const delayMs =
      'delayMs' in parsed && typeof parsed.delayMs === 'number' ? Math.max(0, parsed.delayMs) : undefined
    return { operation: parsed.operation, mode: parsed.mode, delayMs }
  } catch {
    return null
  }
}

async function runWithFault<T>(operation: string, action: () => Promise<T>): Promise<T> {
  const fault = readFault()
  if (!fault || fault.operation !== operation) return action()
  if (fault.mode === 'delay') {
    await new Promise((resolve) => window.setTimeout(resolve, fault.delayMs ?? 1500))
    return action()
  }
  if (fault.mode === 'empty') return [] as T
  throw new Error('Development fault injection')
}

export function withDevelopmentFaults(base: Repositories): Repositories {
  if (process.env.NODE_ENV !== 'development') return base

  return new Proxy(base, {
    get(target, repositoryName, receiver) {
      const repository = Reflect.get(target, repositoryName, receiver)
      if (typeof repository !== 'object' || repository === null) return repository

      return new Proxy(repository, {
        get(repoTarget, methodName, repoReceiver) {
          const method = Reflect.get(repoTarget, methodName, repoReceiver)
          if (typeof method !== 'function') return method

          return (...args: unknown[]) =>
            runWithFault(`${String(repositoryName)}.${String(methodName)}`, () =>
              Promise.resolve(Reflect.apply(method, repoTarget, args)),
            )
        },
      })
    },
  })
}

export const DEV_FAULT_STORAGE_KEY = STORAGE_KEY
