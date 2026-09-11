# Security notice

- Never distribute `.env.local`; it contains live credentials.
- Rotate database passwords, Gemini keys, and `AUTH_SECRET` if they were archived or shared.
- Run `npm ci`, `npm run check`, and migrations in staging before production.
- Rotating `AUTH_SECRET` invalidates existing sessions.
- Production rate limiting must use shared storage; the bundled in-memory limiter is a single-instance fallback.
