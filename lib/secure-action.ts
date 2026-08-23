export async function callSecureAction<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/secure-actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  let body: { error?: string } & T
  try {
    body = (await response.json()) as { error?: string } & T
  } catch {
    throw new Error('The server returned an invalid response.')
  }
  if (!response.ok) throw new Error(body.error || 'The action could not be completed.')
  return body
}
