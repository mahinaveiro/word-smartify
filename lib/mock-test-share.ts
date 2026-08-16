export interface MockTestSharePayload {
  title: string
  text: string
  url: string
}

export type ShareResult = 'shared' | 'copied' | 'cancelled'

export function buildMockTestSharePayload(input: {
  correct: number
  total: number
  score: number
  mistakes: number
  url?: string
}): MockTestSharePayload {
  const score = `${input.score}%`
  const practiceLine = input.mistakes > 0
    ? ` I’m going back to practice ${input.mistakes} missed word${input.mistakes === 1 ? '' : 's'}.`
    : ' Perfect score.'

  return {
    title: 'Word Smartify mock-test result',
    text: `I scored ${input.correct}/${input.total} (${score}) on a Word Smartify mock test.${practiceLine}`,
    url: input.url ?? getCurrentUrl(),
  }
}

export async function shareMockTestResult(payload: MockTestSharePayload): Promise<ShareResult> {
  if (typeof navigator === 'undefined') throw new Error('Sharing is unavailable in this environment.')

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (error) {
      if (isShareCancelled(error)) return 'cancelled'
      // Some browsers expose the share API but reject it in an unsupported
      // context. Falling through to copy keeps the action useful.
    }
  }

  const copyText = `${payload.text}\n${payload.url}`.trim()
  if (await copyWithClipboard(copyText)) return 'copied'
  throw new Error('The result could not be shared or copied.')
}

function getCurrentUrl(): string {
  return typeof window === 'undefined' ? '' : window.location.href
}

async function copyWithClipboard(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Continue to the compatibility fallback below.
    }
  }

  if (typeof document === 'undefined') return false
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  return copied
}

function isShareCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
