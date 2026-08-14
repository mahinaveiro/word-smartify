const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
const vercelSiteUrl = process.env.NEXT_PUBLIC_VERCEL_URL

function requiredValue(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing required Supabase environment variable: ${name}`)
  return value
}

export function getSupabaseConfig() {
  return {
    url: requiredValue('NEXT_PUBLIC_SUPABASE_URL', supabaseUrl),
    publishableKey: requiredValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', supabasePublishableKey),
  }
}

/**
 * Returns the public origin used in links sent by Supabase Auth.
 *
 * Production should set NEXT_PUBLIC_SITE_URL to the canonical HTTPS site URL.
 * Local development intentionally falls back to the current browser origin.
 */
export function getPublicSiteUrl() {
  const configuredUrl = publicSiteUrl || vercelSiteUrl
  const normalizedUrl = configuredUrl
    ? configuredUrl.startsWith('http')
      ? configuredUrl
      : `https://${configuredUrl}`
    : ''
  return normalizedUrl.replace(/\/+$/, '') || (typeof window !== 'undefined' ? window.location.origin : '')
}
