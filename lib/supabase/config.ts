const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

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
