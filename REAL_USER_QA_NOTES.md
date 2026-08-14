## Browser smoke test

- Production build completed successfully and `next start` reported ready on port 3000.
- Direct `curl` to `http://localhost:3000/` returned server-rendered HTML, indicating the server is serving the landing page.
- The sandbox browser could not load either the localhost URL or the temporary exposed URL and displayed its generic "This page couldn't load" screen. This appears to be a browser/proxy reachability issue rather than a Next.js render failure because direct HTTP curl succeeded.
- No authenticated browser QA was claimed; a real Supabase test account and email confirmation mailbox were not available in the session.
## Final post-migration smoke tests — 2026-08-14

The final production build was restarted successfully with `next start`. HTTP smoke tests against `http://localhost:3000` passed:

- `/` returned `200 OK` and rendered `Word Smartify`.
- `/learn` returned `307 Temporary Redirect` to `/auth?next=%2Flearn`.
- `/review` returned `307 Temporary Redirect` to `/auth?next=%2Freview`.
- `DELETE /api/account` without a session returned `401 {"error":"Unauthorized"}`.
- The public Supabase REST API returned `200` for `books`, `chapters`, `levels`, `words`, and `quiz_questions`; exact counts were confirmed as 2, 2, 189, 1888, and 9440 respectively, using the publishable key only.

Authenticated end-to-end QA, password reset confirmation, cross-device synchronization, and account deletion with a real session remain unexecuted because this session has no authorized test account credentials or confirmation-email mailbox. No account was created or modified as a substitute.


## Final security-hardened build smoke test — 2026-08-14

After narrowing public profile and leaderboard selects, the production build again completed successfully. Direct runtime checks still returned `200 OK` for `/`, `307` redirects to `/auth?next=...` for protected `/learn` and `/review`, and `401 Unauthorized` for unauthenticated `DELETE /api/account`.
