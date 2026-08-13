/**
 * Demo credentials surfaced on the sign-in screen so anyone can explore the
 * app immediately. Re-exported through the auth feature (not imported from the
 * data store directly) to keep the UI decoupled from the local storage layer.
 * When Supabase lands, drop this file — the demo hint goes with it.
 */
export { DEMO_EMAIL, DEMO_PASSWORD } from '@/data/auth-store'
