# Security policy

Report vulnerabilities privately to the deployment owner without including credentials or financial records. Production requires rotated secrets, HTTPS, TiDB TLS, staging migrations, verified backups, CI, monitoring, and incident response. Only the latest release is supported.

## Security test suites

Run these against staging or a disposable fixture database only:

```bash
npm run test:auth              # login throttling, session handling
npm run test:isolation         # cross-user read/write isolation
npm run test:key-transport     # zero secret leakage to client bundle / URLs
npm run test:security-headers  # CSP, HSTS, nosniff, frame protection, referrer policy
npm run test:export            # export contains no password hash, token, cookie, or secret
npm run test:lifecycle         # password change invalidates old sessions, cascading account purge
npm run test:logout            # cache storage + IndexedDB cleared on logout
npm run test:input-bounds      # input validation at trust boundaries
npm run test:concurrency       # concurrent debit/transfer cannot go negative
```

Clean up fixtures afterwards:

```bash
npm run test:cleanup
npm run test:cleanup:fixtures
```

## Secrets

- Never commit `.env.local` or distribute it in an archive. It holds live credentials.
- Rotate `DATABASE_PASSWORD`, `GEMINI_API_KEY`, and `AUTH_SECRET` if they were ever archived or shared.
- Rotating `AUTH_SECRET` invalidates all existing sessions.
- Production rate limiting must use shared storage; the bundled in-memory limiter is a single-instance fallback.
- OCR fail-closes when `GEMINI_API_KEY` is absent.
- Client-Side Encrypted Backup (`.kasdesk.enc`) uses native Web Crypto API (`AES-256-GCM` with 100,000 PBKDF2 iterations and random 16-byte salt/12-byte IV). Passphrase never leaves the browser.
