# Supabase migration guidance notes

## Current official guidance reviewed on 2026-08-14

- Supabase Next.js SSR uses `@supabase/supabase-js` and `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Browser code should use a browser client; server components, server actions, and route handlers should create request-scoped server clients using cookies.
- Server-side identity protection should use `supabase.auth.getClaims()` or `getUser()` as appropriate; `getSession()` alone must not be trusted for authorization.
- Next.js proxy/middleware should refresh Auth cookies and propagate refreshed cookies to the request and response.
- SSR signup confirmation uses PKCE and a token exchange route such as `/auth/confirm` using `verifyOtp`.
- RLS must remain enabled on exposed public tables. Policies should use `TO authenticated` / `TO anon` and ownership predicates; UPDATE policies require both `USING` and `WITH CHECK`.
- Never expose a service-role or secret key in browser code; any `NEXT_PUBLIC_*` variable is public.
- New public tables may not be automatically exposed through the Data API under recent Supabase changes, so future schema changes must verify Data API exposure and grants. This migration should not create tables.
- Supabase changelog items relevant to this project include the 2026-04-28 Data API auto-exposure breaking change, the 2026-07-10 TypeScript 5.0 requirement notice for `@supabase/supabase-js` beginning 2027-01-31, and the 2026-05-08 Node.js 20 support removal; this project uses Node.js 22 and TypeScript 5.7.3.

## Source URLs

- https://supabase.com/changelog.md
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security

## Project-specific constraints from the user

- The live Supabase schema is authoritative.
- Preserve the existing UI, UX, routes, business logic, and design.
- Do not modify the database schema unless a later production/security issue is explicitly justified.
- Use the existing repository interfaces; do not put Supabase queries in UI components.
- Replace local Auth, content, and user-data backends without a silent local fallback.
- Provision `profiles` and `user_stats` exactly once for new authenticated users; the live project currently has 3 Auth users and 0 rows in both tables.
- Preserve the live `user_word_progress.status` values: `new`, `learning`, `strong`, `mastered`.
- Treat live `quiz_questions.options` as JSONB.
- Respect live `daily_goal` values: 5, 10, 15, 20, 30.
- Do not invent the stale handoff columns `completed_at`, `answered_at`, or any other undocumented live fields.
