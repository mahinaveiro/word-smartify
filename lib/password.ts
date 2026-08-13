/**
 * Password policy — shared by the live requirement panel (UI) and the auth
 * service (validation). One source of truth so the panel can never disagree
 * with what actually gets enforced.
 */

export const PASSWORD_MIN = 9
export const PASSWORD_MAX = 64

export interface PasswordRuleResult {
  id: string
  label: string
  ok: boolean
}

export function checkPassword(pw: string): {
  rules: PasswordRuleResult[]
  valid: boolean
} {
  const rules: PasswordRuleResult[] = [
    { id: 'length', label: `${PASSWORD_MIN}–${PASSWORD_MAX} characters`, ok: pw.length >= PASSWORD_MIN && pw.length <= PASSWORD_MAX },
    { id: 'upper', label: 'An uppercase letter', ok: /[A-Z]/.test(pw) },
    { id: 'lower', label: 'A lowercase letter', ok: /[a-z]/.test(pw) },
    { id: 'number', label: 'A number', ok: /[0-9]/.test(pw) },
    { id: 'special', label: 'A special character', ok: /[^A-Za-z0-9]/.test(pw) },
  ]
  return { rules, valid: rules.every((r) => r.ok) }
}

export function isValidEmail(email: string): boolean {
  // Deliberately simple + practical — not RFC-exhaustive.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
