export const DISPLAY_NAME_MIN = 2
export const DISPLAY_NAME_MAX = 40

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
