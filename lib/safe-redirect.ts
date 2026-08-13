/**
 * Open-redirect guard for the `?next=` parameter.
 *
 * Only same-origin, absolute in-app paths are allowed. Anything that could
 * bounce the user to another origin (protocol-relative `//evil.com`,
 * `https://evil.com`, backslash tricks, encoded schemes) falls back to a safe
 * default.
 */

const DEFAULT_DESTINATION = '/dashboard'

export function safeNext(
  next: string | null | undefined,
  fallback: string = DEFAULT_DESTINATION,
): string {
  if (!next) return fallback

  let candidate = next
  // Peel one layer of encoding so `%2F%2Fevil.com` can't sneak through.
  try {
    candidate = decodeURIComponent(next)
  } catch {
    return fallback
  }

  // Must be a single absolute path within this app.
  if (!candidate.startsWith('/')) return fallback
  // Reject protocol-relative and backslash-escaped authority attempts.
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback
  // Reject anything that smuggles a scheme (e.g. "/x:https://...").
  if (/^\/?[a-z][a-z0-9+.-]*:/i.test(candidate.replace(/^\//, ''))) return fallback

  return candidate
}
