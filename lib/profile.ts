export const DISPLAY_NAME_MIN = 2
export const DISPLAY_NAME_MAX = 40
export const AVATAR_URL_MAX = 2048

export function validateAvatarUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length > AVATAR_URL_MAX) {
    return `Avatar URL must be ${AVATAR_URL_MAX} characters or fewer.`
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Avatar URL must start with http:// or https://.'
    }
  } catch {
    return 'Enter a valid http:// or https:// avatar URL.'
  }
  return null
}

export function validateDisplayName(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Display name is required.'
  if (trimmed.length < DISPLAY_NAME_MIN) {
    return `Display name must be at least ${DISPLAY_NAME_MIN} characters.`
  }
  if (trimmed.length > DISPLAY_NAME_MAX) {
    return `Display name must be ${DISPLAY_NAME_MAX} characters or fewer.`
  }
  return null
}
