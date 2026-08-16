# Resend report-email integration findings

Source review date: 2026-08-17.

## Official requirements

- Store the Resend API key in a server-only environment variable named `RESEND_API_KEY`.
- Never hard-code the API key or expose it in client-side code.
- Install the `resend` package with the project package manager (`pnpm add resend`).
- Use `await resend.emails.send(...)` and inspect the returned `{ data, error }` object.
- Use camelCase SDK parameters such as `replyTo` and `idempotencyKey`.
- Use a verified domain in the production `from` address. `onboarding@resend.dev` is testing-only and can send only to the email address associated with the Resend account.
- Resend recommends an idempotency key for safe retries; keys expire after 24 hours and may be up to 256 characters.
- Default rate limit is 10 requests per second per team.

## Project configuration decisions

- Vercel variable for the secret: `RESEND_API_KEY`.
- Vercel variable for the report recipient: `QUESTION_REPORTS_TO_EMAIL`.
- Vercel variable for the verified sender: `QUESTION_REPORTS_FROM_EMAIL`.
- The Supabase report row remains the durable backup. Email delivery is best-effort after the row is saved.
- The API route must run server-side, require an authenticated Supabase user, validate category/note/question IDs, and never accept an arbitrary recipient or sender from the browser.

## Official references

- https://resend.com/docs/send-with-nextjs
- https://resend.com/docs/knowledge-base/how-to-handle-api-keys
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/knowledge-base/403-error-resend-dev-domain
