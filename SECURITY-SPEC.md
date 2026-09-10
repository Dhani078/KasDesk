# KASDESK — Security & Privacy Specification

**Status:** Draft v1.1 — corrected for the TiDB (MySQL) + Auth.js stack
**Last Updated:** 2026-09-10
**Authoritative for:** threat model, auth architecture, app-layer authorization, secrets, validation, privacy
**Supersedes:** `SECURITY.md` (marked superseded); v1.0 of this file (Supabase/RLS)
**Derived from:** `PRD.md` §10 (NFR-S/P), §11.2/11.3/11.5 (defects)
**Method skills:** `stride-analysis-patterns`, `attack-tree-construction`, `threat-mitigation-mapping`, `security-requirement-extraction`, `auth-implementation-patterns`, `secrets-management`, `sast-configuration`

> **Stack correction (v1.1).** v1.0 of this document described Supabase
> PostgreSQL with Row Level Security as the authorization boundary. **That stack
> was replaced.** The live stack is **TiDB Cloud (MySQL-compatible)** +
> **Drizzle ORM** + **Auth.js**.
>
> **MySQL/TiDB has no RLS; authorization is enforced in the application layer
> only.** Every query MUST include `WHERE user_id = ?`. There is no database
> safety net — one missing filter is a cross-user data leak.
>
> Any remaining `auth.uid()`, `RLS`, `WITH CHECK`, `SECURITY DEFINER` or
> Supabase SQL in this repo is stale. See `DATABASE-SPEC.md` §0.1.

---

## 0. Scope & Legal Regime

### 0.1 What We Protect

| Asset | Sensitivity | Notes |
| :--- | :--- | :--- |
| Financial records (income/expense/transfer) | **HIGH** | Core product data; reveals income, habits, relationships |
| Wallet balances | **HIGH** | Direct monetary value |
| Debt records (utang/piutang) | **HIGH** | Reveals social/financial relationships |
| Savings goals (vaults) | MEDIUM | Aspirational financial data |
| Email address | MEDIUM | PII; enables phishing |
| Receipt images | MEDIUM–HIGH | **Never persisted** (FR-OCR-7) — transmitted transiently |
| Password hash | **CRITICAL** | Held in `users.passwordHash` (bcryptjs cost 12, Auth.js credentials) |
| Session token | **CRITICAL** | Auth.js JWT in HttpOnly `authjs.session-token` cookie |

### 0.2 Governing Law: **UU PDP No. 27/2022** (not GDPR)

⚠️ **Scoping correction.** The `gdpr-data-handling` skill is **EU-only** and does not govern
Indonesian data subjects. The controlling regime for KASDESK is:

- **UU No. 27 Tahun 2022** tentang Pelindungan Data Pribadi (UU PDP)
- Implementing government regulations (PP)
- Sectoral rules if bank aggregation is ever added (BI / OJK)

Where GDPR language appears below it is used as a structural template only; §7 maps
requirements to UU PDP obligations.

---

## 1. Trust Boundaries & Data Flow

### 1.1 Trust Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│ TB-1  UNTRUSTED: User device / browser                           │
│   - PWA client, Zustand store, IndexedDB offline queue           │
│   - Attacker may control this entirely                           │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS (TLS 1.3)
┌────────────────────────────▼─────────────────────────────────────┐
│ TB-2  TRUSTED: Next.js server (Vercel edge/node)                 │
│   - Server Actions, Route Handlers, middleware.ts                │
│   - Holds DATABASE_* creds, AUTH_SECRET, GEMINI_API_KEY          │
│     (all server-only)                                            │
│   - Verifies the Auth.js session; derives userId server-side     │
│   - *** THE AUTHORIZATION BOUNDARY IS HERE (see 1.2) ***         │
└────────────────────────────┬─────────────────────────────────────┘
                             │ TLS + MySQL protocol (server-side creds only)
┌────────────────────────────▼─────────────────────────────────────┐
│ TB-3  TRUSTED (storage only): TiDB Cloud (MySQL)                 │
│   - Stores rows; performs NO authorization of its own            │
│   - App-layer user_id filtering is the authorization boundary    │
│   - No RLS: a missing WHERE user_id = ? leaks every user         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ TB-4  EXTERNAL: Gemini API                                       │
│   - Receives receipt image bytes + prompt                        │
│   - Untrusted in the sense that output must be validated         │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Critical Principle

> **Application-layer `user_id` scoping is the authorization boundary.**
> **Every query MUST include `WHERE user_id = ?`; there is no database safety net.**
>
> MySQL/TiDB has no Row Level Security. The database will happily return or modify
> another user's rows if the application forgets to filter, so a bug in a Server
> Action **can** leak another user's data. §6 is mandatory reading for anyone
> touching `lib/actions.ts`.

---

## 2. STRIDE Threat Model

Method: enumerate per element, assign STRIDE category, rate risk, derive mitigation.

### 2.1 STRIDE Categories

| Cat | Question | Control Family |
| :-- | :--- | :--- |
| **S**poofing | Can attacker pretend to be someone else? | Authentication |
| **T**ampering | Can data be modified in transit/at rest? | Integrity |
| **R**epudiation | Can attacker deny actions? | Logging / audit |
| **I**nformation Disclosure | Can attacker access unauthorized data? | Encryption / app-layer authz |
| **D**enial of Service | Can attacker disrupt availability? | Rate limiting |
| **E**levation of Privilege | Can attacker gain higher privileges? | Authorization / app-layer authz |

### 2.2 Threat Catalog

Legend: **L**ikelihood (L/M/H) · **I**mpact (L/M/H) · **R**isk = combined

| ID | Element | STRIDE | Threat | L | I | Risk | Mitigation |
| :-- | :--- | :--: | :--- | :-: | :-: | :--: | :--- |
| T-01 | Auth.js credentials | **S** | Credential stuffing / password guessing | M | H | **HIGH** | **Application rate limiting (§5.4)**; strong password policy (min 8); bcryptjs cost 12; consider MFA (v1.1) |
| T-02 | Session | **S** | Stolen `authjs.session-token` → persistent access | M | H | **HIGH** | HttpOnly + Secure + SameSite=Lax cookie; 30 d JWT `maxAge`; rotate `AUTH_SECRET` to invalidate all sessions on suspicion |
| T-03 | OAuth (Google) | **S** | Account linking confusion | L | M | MED | Auth.js handles PKCE; verify `aud`/`iss`; single canonical email |
| T-04 | Server Action | **T** | Attacker crafts request to modify another user's row | M | H | **HIGH** | **Server-side ownership verification + `user_id` filter on every UPDATE/DELETE**; Zod validation; never trust client-supplied `user_id` |
| T-05 | Wallet balance | **T** | Balance manipulated without matching transaction | M | H | **HIGH** | **Only inside `db.transaction()`** in `lib/actions.ts`; no direct client UPDATE (defect §11.4) |
| T-06 | `amount` field | **T** | Negative/zero amount → balance corruption | M | M | **HIGH** | Zod `.positive()` + DB `CHECK (amount > 0)` (defect §11.3) |
| T-07 | Transaction | **R** | User denies an edit/delete | M | L | MED | Append-only audit log of mutations (v1.1); `updated_at` tracked |
| T-08 | App-layer authz | **I** | Query missing `WHERE user_id = ?` → cross-user read/write | M | H | **HIGH** | Mandatory `userId` predicate on **every** SELECT/UPDATE/DELETE (SR-01); ownership re-check before mutation |
| T-09 | App-layer authz | **I** | Unscoped query → whole table readable | L | H | **HIGH** | Deny-by-default *in code*: every read goes through a `userId`-scoped query; CI grep + integration tests (§10) |
| T-10 | Transport | **I** | MITM on public wifi | L | H | MED | HTTPS enforced (HSTS); no mixed content |
| T-11 | Logs | **I** | Financial data leaked into logs/analytics | M | M | **HIGH** | Never log amounts/titles; sanitize; no PII in error messages |
| T-12 | Receipt image | **I** | Image persisted / leaked | M | M | MED | **Never persist** (FR-OCR-7); process in memory, discard |
| T-13 | Gemini prompt | **I/E** | Prompt injection via receipt text | M | M | **HIGH** | Image treated as data; output Zod-validated; no tool-calling |
| T-14 | `/api/scan-receipt` | **D** | Cost DoS — attacker spams OCR | M | M | **HIGH** | Per-user rate limit; monthly cap; auth required |
| T-15 | `/api/scan-receipt` | **D** | Huge image → memory exhaustion | M | M | MED | Max 10 MB; dimension downscale; timeout |
| T-16 | Server Action | **D** | Spam transaction creation | L | L | LOW | Rate limit per user |
| T-17 | DB credentials | **E** | DB / auth secret leaks → full-database access | L | H | MED | `DATABASE_PASSWORD`, `AUTH_SECRET`, `GEMINI_API_KEY` **server-only**, never `NEXT_PUBLIC_` |
| T-18 | Server Actions | **E** | Unscoped mutation / dynamic SQL abused | M | H | **HIGH** | Parameterized Drizzle queries only; no string-built SQL; `requireUserId()` inside every action |
| T-19 | Client (Zustand) | **I** | Another user's data in a shared device cache | L | M | MED | Clear store on logout; no sensitive data in `localStorage` |
| T-20 | Offline queue | **T/I** | Queued mutations replayed after 30d (FR-LOG-11) | L | M | MED | 30-day expiry; re-validate on replay; discard on conflict |
| T-21 | Dependencies | **E** | Supply-chain compromise | M | H | **HIGH** | Lockfile committed; Dependabot; `npm audit` gate |
| T-22 | Env vars | **I** | Secrets committed to Git | M | H | **HIGH** | `.gitignore` covers `.env*`; secret scanning; pre-commit hook |

---

## 3. Attack Trees

Notation: `Goal` → `OR` / `AND` branches → leaf conditions marked
`[POSSIBLE]` / `[MITIGATED]` / `[IMPOSSIBLE]`.

### 3.1 AT-01 — Steal Another User's Financial Data

```
[GOAL] Read another user's transactions
├── OR
│   ├── 1. Bypass authentication [POSSIBLE]
│   │   ├── 1.1 Guess/brute-force password [MITIGATED — rate limit + strength]
│   │   ├── 1.2 Steal session cookie [MITIGATED — HttpOnly + Secure + SameSite]
│   │   └── 1.3 Replay a stolen session JWT [MITIGATED — HttpOnly cookie; rotate AUTH_SECRET to revoke all]
│   ├── 2. Exploit a missing user_id filter [POSSIBLE → must be MITIGATED]
│   │   ├── 2.1 Unscoped SELECT returns every user's rows [MITIGATED — scoped query helpers]
│   │   ├── 2.2 Enumerate another user's rows by id [MITIGATED — WHERE user_id = ?]
│   │   └── 2.3 Unscoped UPDATE/DELETE hits another user's row [MITIGATED — mandatory userId predicate]
│   ├── 3. Exploit a Server Action [POSSIBLE]
│   │   ├── 3.1 Pass another user_id in payload [MITIGATED — server derives user_id]
│   │   └── 3.2 IDOR on transaction id [MITIGATED — ownership verified + userId filter]
│   └── 4. Client-side leakage [POSSIBLE]
│       ├── 4.1 Sensitive data in localStorage [MITIGATED — memory only]
│       └── 4.2 Data in service-worker cache [MITIGATED — no API caching in SW]
```

**Critical controls:** `WHERE user_id = ?` on every query (T-08, T-09);
server-derived `userId` from `requireUserId()` (T-04). **No RLS exists to catch a
miss.**

### 3.2 AT-02 — Drain / Inflate a Wallet Balance

```
[GOAL] Make a wallet balance wrong without a valid transaction
├── OR
│   ├── 1. Direct UPDATE wallets.balance [POSSIBLE → currently UNMITIGATED]
│   │   └── MITIGATION: no client path to balance writes; `lib/actions.ts` is the
│   │       only writer and only inside db.transaction() (defect §11.4)
│   ├── 2. Non-atomic write [POSSIBLE]
│   │   ├── 2.1 Transaction inserted but balance update fails [MITIGATED — RPC transaction]
│   │   └── 2.2 Two concurrent transfers race [MITIGATED — SELECT ... FOR UPDATE]
│   ├── 3. Negative amount [POSSIBLE → defect §11.3]
│   │   └── MITIGATION: Zod .positive() + CHECK (amount > 0)
│   ├── 4. Delete transaction without reversal [POSSIBLE]
│   │   └── MITIGATION: trigger reverses balance (defect §11.4)
│   └── 5. Edit transaction amount without adjusting balance [POSSIBLE]
│       └── MITIGATION: trigger applies delta on UPDATE
```

### 3.3 AT-03 — Abuse the Gemini OCR Endpoint

```
[GOAL] Exploit /api/scan-receipt
├── OR
│   ├── 1. Cost exhaustion (financial DoS) [POSSIBLE]
│   │   ├── 1.1 Anonymous spam [MITIGATED — require auth]
│   │   ├── 1.2 Authenticated spam [MITIGATED — per-user rate limit + cap]
│   │   └── 1.3 Oversized image [MITIGATED — 10 MB cap + downscale]
│   ├── 2. Prompt injection [POSSIBLE]
│   │   ├── 2.1 Text in receipt says "ignore previous instructions" [MITIGATED]
│   │   │   └── image passed as DATA, instructions in system prompt only
│   │   ├── 2.2 Inject to exfiltrate via URL in response [MITIGATED — no tools/network]
│   │   └── 2.3 Inject to alter JSON schema [MITIGATED — Zod validates; reject on fail]
│   └── 3. Data exfiltration [POSSIBLE]
│       └── 3.1 Trick model into echoing secrets [MITIGATED — no secrets in prompt]
```

---

## 4. Derived Security Requirements

Format: `ID · Requirement · Threat ref · Priority · Verification`

| ID | Requirement | Threats | Pri | Verification |
| :-- | :--- | :--- | :--: | :--- |
| SR-01 | **Every** query is scoped by `userId` (no RLS exists to fall back on) | T-08, T-09 | **P0** | Code review; CI grep; cross-user integration tests |
| SR-02 | Every mutation verifies row ownership **and** filters by `userId` in the same statement | T-08 | **P0** | Integration test: cross-user UPDATE/DELETE affects 0 rows |
| SR-03 | `userId` always derived server-side via `requireUserId()`, never from client payload | T-04 | **P0** | Code review + unit test rejects client `userId` |
| SR-04 | Wallet balance mutated **only** inside `db.transaction()` in `lib/actions.ts` | T-05 | **P0** | Code review; no other writer; integration test |
| SR-05 | `amount > 0` enforced in Zod **and** DB CHECK | T-06 | **P0** | Unit test (Zod) + SQL constraint test |
| SR-06 | `middleware.ts` protects routes via the Auth.js edge session | T-02 | **P0** | E2E: unauthenticated request redirects to `/login` |
| SR-07 | Session JWT (30 d maxAge, `strategy: 'jwt'`) in HttpOnly `authjs.session-token` cookie | T-02 | **P0** | Manual inspection of cookie flags |
| SR-08 | `DATABASE_PASSWORD`, `AUTH_SECRET`, `GEMINI_API_KEY` never exposed to client; no `NEXT_PUBLIC_` prefix | T-17 | **P0** | Grep CI check; secret scanning |
| SR-09 | All SQL built with parameterized Drizzle helpers — no string concatenation | T-18 | **P0** | Code review; grep for raw SQL interpolation |
| SR-10 | Receipt images never written to disk/object storage; processed in memory | T-12 | **P0** | Code review; no storage bucket created |
| SR-11 | OCR output validated by Zod before use; reject on schema failure | T-13 | **P0** | Unit test with malformed model output |
| SR-12 | OCR endpoint requires authentication | T-14 | **P0** | E2E: unauthenticated POST → 401 |
| SR-13 | OCR endpoint rate-limited per user (e.g. 20/hour) + monthly cap | T-14 | **P1** | Rate-limit test |
| SR-14 | Image upload capped at 10 MB, downscaled before API call | T-15 | **P1** | Unit test rejects >10 MB |
| SR-15 | No financial data (amounts, titles, merchant) in logs or analytics | T-11 | **P0** | Log review; grep in CI for `console.log` of payloads |
| SR-16 | Password policy: min 8 chars; hashed with bcryptjs cost 12 | T-01 | **P1** | Config check |
| SR-17 | HTTPS enforced; HSTS enabled | T-10 | **P1** | Header check in E2E |
| SR-18 | Zustand store cleared on logout; no sensitive data persisted | T-19 | **P1** | Unit test on logout |
| SR-19 | Offline queue expires after 30 days; re-validated on replay | T-20 | **P2** | Unit test |
| SR-20 | Lockfile committed; `npm audit` in CI; Dependabot enabled | T-21 | **P1** | CI config |
| SR-21 | `.env*` git-ignored; `.env.example` complete and secret-free | T-22 | **P0** | `git check-ignore`; secret scan |
| SR-22 | Error messages generic; no stack traces or PII to client | T-11 | **P1** | Error-handling test |
| SR-23 | Login + register endpoints rate-limited per IP **and** per email | T-01 | **P1** | Rate-limit test (§5.4) |
| SR-24 | Shared `userId`-scoped query helpers used instead of ad-hoc `db.select()` | T-08, T-09 | **P0** | Code review; lint rule / grep gate |

---

## 5. Authentication Architecture

### 5.1 Flows

| Flow | Mechanism |
| :--- | :--- |
| Email + password | **Auth.js Credentials provider**; `users.passwordHash` verified with bcryptjs (cost 12, `lib/auth/password.ts`) |
| Google OAuth | **Auth.js Google provider** — Auth.js handles **PKCE**; callback at `/api/auth/callback/google` |
| Session | JWT strategy (`strategy: 'jwt'`), `maxAge` 30 d, `authjs.session-token` cookie |
| Storage | HttpOnly, Secure, SameSite=Lax cookie managed by Auth.js (no refresh-token table) |

Two Auth.js instances exist on purpose:

| File | Runtime | Contains |
| :--- | :--- | :--- |
| `auth.config.ts` | Edge-safe | pages, session strategy, callbacks, Google provider |
| `auth.ts` | Node | + Credentials `authorize` (needs bcryptjs + mysql2) |
| `auth.edge.ts` | Edge | second instance built from `authConfig`, used by `middleware.ts` |

### 5.2 `middleware.ts` — **FIXES PRD §11.2**

`middleware.ts` runs the **Edge** Auth.js instance (`auth.edge.ts`). It must never
import `bcryptjs` or `mysql2` — either would break the Edge build.

```ts
// middleware.ts
import { edgeAuth } from '@/auth.edge'
import { NextResponse } from 'next/server'

export default edgeAuth((req) => {
  const isLoggedIn = !!req.auth?.user?.id
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/auth')) return NextResponse.next()

  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/register')

  // Send signed-in users away from the auth screens.
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Everything else requires a session.
  if (!isAuthRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*).*)',
  ],
}
```

### 5.3 Rules

- **Never** trust a client-passed user id. Server Actions call
  `requireUserId()` (`lib/auth/session.ts`), which reads the Auth.js session.
- Route protection in `middleware.ts` is a **UX redirect, not authorization**.
  Every Server Action and Route Handler must re-check the session itself.
- `AUTH_SECRET` is server-only and must be >= 32 bytes of entropy.
- Logout calls `signOut()` and clears the Zustand store (SR-18).

### 5.4 Application Rate Limiting (SR-23)

There is **no provider built-in rate limiting** in this stack. Until a shared
limiter (e.g. Upstash Redis / Vercel KV) is wired in, the following must be
implemented in-application:

| Endpoint | Limit | Scope |
| :--- | :--- | :--- |
| Login (Credentials callback) | 10 / 15 min | per IP **and** per email |
| `registerUser` | 5 / hour | per IP |
| `/api/scan-receipt` | 20 / hour + monthly cap | per `userId` (SR-13) |
| Server Action mutations | 60 / min | per `userId` |

Notes:

- Count **failed** login attempts per email as well as per IP, so credential
  stuffing is slowed even when spread across addresses.
- `verifyPassword()` runs a dummy bcrypt compare when the account does not
  exist (`lib/auth/password.ts`), so login timing does not disclose whether an
  email is registered.
- bcrypt cost 12 is a deliberate CPU-cost control; do not raise concurrency on
  the login path without a limiter in front of it.

---
## 6. Authorization: App-Layer `user_id` Scoping ***

> **There is no RLS.** MySQL/TiDB cannot enforce per-row authorization for us.
> Everything below is enforced by application code, and a single forgotten
> `WHERE userId = ?` is a full cross-user data breach.

### 6.1 The One Rule

```ts
// lib/auth/session.ts
export async function requireUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}
```

Every Server Action / Route Handler MUST:

1. call `requireUserId()` (or `assertUserId()`), **then**
2. include `eq(table.userId, userId)` in **every** SELECT, UPDATE and DELETE.

### 6.2 Correct Pattern (all tables)

```ts
'use server'
import { and, eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'

/** READ — scoped, so another user's rows can never be returned. */
export async function listTransactions() {
  const userId = await requireUserId()
  if (!userId) return []

  return db.select()
    .from(transactions)
    .where(eq(transactions.userId, userId))   // MANDATORY
    .orderBy(desc(transactions.date))
}

/** WRITE — ownership is enforced in the same statement (no separate pre-check). */
export async function updateTransaction(id: string, raw: unknown) {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: { code: 'UNAUTHENTICATED' } }

  const parsed = TransactionSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: { code: 'VALIDATION_ERROR' } }

  // and(eq(id), eq(userId)) — the userId predicate is what stops IDOR.
  const result = await db.update(transactions)
    .set(parsed.data)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))

  if (result[0].affectedRows === 0) {
    // Either not found, or not yours — answer identically for both.
    return { success: false, error: { code: 'NOT_FOUND' } }
  }
  return { success: true }
}
```

### 6.3 Hardening Checklist

- [ ] Every `db.select()` / `db.update()` / `db.delete()` on a user table has a
      `userId` predicate (SR-01, SR-02)
- [ ] No unfiltered `.from(table)` on `wallets`, `transactions`, `vaults`,
      `debts`, `categories` — that is the MySQL equivalent of `USING (true)`
- [ ] Ownership enforced in the same statement as the mutation, not in a
      separate pre-check that could race or be bypassed
- [ ] `wallets.balance` written **only** inside `db.transaction()` in
      `lib/actions.ts` (SR-04)
- [ ] Parameterized Drizzle queries only — never interpolate user input into SQL
      (SR-09)
- [ ] `NOT_FOUND` (not `FORBIDDEN`) returned for another user's row, so
      existence is not disclosed
- [ ] Cross-user integration tests in CI (see §10)

### 6.4 Balance mutation (SR-04)

There is no `SECURITY DEFINER` RPC to grant or revoke — the guarantee is
structural instead: nothing outside `lib/actions.ts` writes `wallets.balance`,
and it only does so inside a `db.transaction()` so the transaction row and the
balance change commit or roll back together.

---
## 7. Input Validation (Zod)

### 7.1 Fix for defect §11.3 — `amount` lacks `.positive()`

```ts
// lib/schemas.ts
export const TransactionSchema = z.object({
  wallet_id:   z.string().uuid('Wallet tidak valid'),
  type:        z.enum(['income', 'expense', 'transfer']),
  amount:      z.number()
                 .positive('Jumlah harus lebih dari 0')   // ← FIX
                 .max(100_000_000_000, 'Jumlah terlalu besar'),
  title:       z.string().trim().min(1, 'Judul wajib diisi').max(120),
  category_tag: z.string().trim().max(32).optional(),
  note:        z.string().trim().max(500).optional(),
  to_wallet_id: z.string().uuid().optional(),
}).refine(
  (d) => d.type !== 'transfer' || !!d.to_wallet_id,
  { message: 'Transfer memerlukan dompet tujuan', path: ['to_wallet_id'] }
).refine(
  (d) => d.type !== 'transfer' || d.wallet_id !== d.to_wallet_id,
  { message: 'Dompet asal dan tujuan tidak boleh sama', path: ['to_wallet_id'] }
)
```

### 7.2 Validation Rules

- Validate **every** Server Action input with Zod — never trust the client.
- Validate **every** external/AI response (Gemini) with Zod (SR-11).
- Return field-level errors; never expose internal messages (SR-22).
- Enforce limits (max lengths) to prevent payload abuse.
- Defense in depth: Zod **and** DB CHECK constraints — not either/or.

---

## 8. Secrets Management

### 8.1 Rules

1. Never commit secrets. `.gitignore` includes `.env*` (already correct).
2. `.env.example` documents every variable with **empty/placeholder values only**.
3. Server-only secrets (`DATABASE_PASSWORD`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`,
   `GEMINI_API_KEY`) carry **no** `NEXT_PUBLIC_` prefix.
4. Rotate on suspicion; rotate Gemini key if usage looks anomalous.
5. Use platform secret storage (Vercel env vars / TiDB Cloud console), not files in prod.
6. Add a pre-commit secret-scanning hook.

### 8.2 Required `.env.example` — **FIXES PRD §11.5**

```bash
# ── TiDB Cloud (MySQL-compatible) ────────────────────
DATABASE_HOST=                # gateway01.<region>.prod.aws.tidbcloud.com
DATABASE_PORT=                # 4000
DATABASE_USER=                # <user>.root
DATABASE_PASSWORD=            # server-only — FULL database access

# ── Auth.js ─────────────────────────────────────────
AUTH_SECRET=                  # server-only — openssl rand -base64 32
AUTH_URL=                     # http://localhost:3000 | https://kasdesk.app
AUTH_TRUST_HOST=              # true behind a proxy (Vercel)
AUTH_GOOGLE_ID=               # server-only
AUTH_GOOGLE_SECRET=           # server-only

# ── Gemini AI (receipt OCR) ─────────────────────────
GEMINI_API_KEY=               # server-only

# ── App ─────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=         # http://localhost:3000 | https://kasdesk.app
```

Rules:
- `DATABASE_PASSWORD`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET` and `GEMINI_API_KEY`
  must **never** be `NEXT_PUBLIC_`.
- CI must fail if a `NEXT_PUBLIC_` var name matches `/KEY|SECRET|TOKEN|PASSWORD/`.

### 8.3 Verification

```bash
git check-ignore -v .env.local     # must show it is ignored
grep -rn "DATABASE_PASSWORD\|AUTH_SECRET\|GEMINI_API_KEY" app components lib   # must be empty
```

---

## 9. Privacy (UU PDP No. 27/2022)

### 9.1 Lawful Basis & Consent

| Processing | Basis (UU PDP) |
| :--- | :--- |
| Account creation | Consent / contract performance |
| Storing financial records | Contract performance (service requested) |
| Receipt OCR | **Explicit consent** — opt-in, revocable |
| Analytics | Consent; anonymized, no financial values |

Consent must be: explicit, informed, recorded (timestamp + version), withdrawable.

### 9.2 Data Minimization

- Collect only what the product needs. No phone number, no KTP, no address.
- Receipt images: **used transiently, never stored** (SR-10, FR-OCR-7).
- Analytics: events only (e.g. "transaction_created"), **never** amounts or titles.

### 9.3 Retention

| Data | Retention |
| :--- | :--- |
| Transactions | While account active + 30 d after deletion request |
| Account | Until deletion request |
| Backups | 30 d rolling |
| Server logs | 30 d (no financial payloads) |
| Receipt images | **0 — never persisted** |
| Offline queue | 30 d max (FR-LOG-11) |

### 9.4 Data Subject Rights (UU PDP)

| Right | Implementation |
| :--- | :--- |
| Access | Export JSON/CSV — "Unduh data saya" |
| Correction | Edit any record in-app |
| Deletion | "Hapus akun" → cascade delete; confirm via email |
| Withdraw consent | Toggle off OCR / analytics |
| Portability | Machine-readable export |

**Deletion cascade:** TiDB is configured without enforced FKs, so deleting a
`users` row does **not** cascade by itself. The delete-account action MUST delete
child rows explicitly — in one transaction — across `wallets`, `transactions`,
`vaults`, `debts`, `categories` (see `DATABASE-SPEC.md` §FK).

### 9.5 Breach Response (UU PDP: notify within **3 × 24 hours**)

1. **Contain** — revoke keys, disable affected accounts.
2. **Assess** — scope, data types, number of subjects.
3. **Notify** — authorities within 3×24 h; affected users without undue delay.
4. **Remediate** — patch, rotate credentials.
5. **Document** — incident record retained ≥ 5 years.

### 9.6 Notices

Privacy policy and terms must be in **Bahasa Indonesia**, plain language, accessible
before signup.

---

## 10. CI Security Gates

| Gate | Tool | Blocks merge when |
| :--- | :--- | :--- |
| Secret scanning | gitleaks / TruffleHog | Any secret detected |
| Dependency audit | `npm audit --audit-level=high` | High/critical vuln |
| SAST | ESLint security plugin / CodeQL | High-severity finding |
| Type safety | `tsc --noEmit` | Any error |
| `NEXT_PUBLIC_` leak | Custom grep | Secret-like name exported to client |
| Query scoping | CI grep / lint rule | Any `db.select()` on a user table without a `userId` predicate |
| Cross-user tests | Integration tests (two seeded users) | User A can read/write user B's rows |
| License check | `license-checker` | Copyleft incompatibility |

### 10.1 Cross-User Authorization Test (example)

Because there is no RLS, the **only** thing standing between users is the
`userId` predicate. These tests are P0 — they are the last line of defense.

```ts
// tests/authz.test.ts
it('user A cannot read user B transactions', async () => {
  const rows = await asUserA
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userB.id))
  expect(rows).toEqual([])      // must be filtered, not trusted
})

it('user A cannot update a row owned by user B', async () => {
  const res = await asUserA
    .update(transactions)
    .set({ amount: 1 })
    .where(and(eq(transactions.id, rowB.id), eq(transactions.userId, userA.id)))
  expect(res[0].affectedRows).toBe(0)   // userId mismatch -> no rows touched
})

it('an unscoped SELECT is impossible: every export is userId-scoped', async () => {
  // CI grep gate: fail if any db.select() on a user table lacks eq(userId)
})
```

---

## 11. Launch Security Checklist

Mapped to the defects in PRD §11.

- [ ] **§11.1** `.env.local` created from `.env.example` with real values (not committed)
- [ ] **§11.2** `middleware.ts` exists and protects routes via the Auth.js edge session (SR-06)
- [ ] **§11.3** `amount` has `.positive()` in Zod **and** DB CHECK (SR-05)
- [ ] **§11.4** `lib/actions.ts` is the only balance writer, always inside
      `db.transaction()`; delete/update apply the reversal (SR-04)
- [ ] **§11.5** `GEMINI_API_KEY` documented in `.env.example`; dependency installed
- [ ] **§11.12** Client never passes `userId`; server derives it via `requireUserId()` (SR-03)
- [ ] Every query on a user table is `userId`-scoped (SR-01, SR-02, SR-24)
- [ ] Query-scoping CI grep clean
- [ ] Cross-user authorization tests passing
- [ ] Secret scanning enabled; no secrets in history
- [ ] `npm audit` clean at high/critical
- [ ] No financial data in logs (SR-15)
- [ ] Receipt images not persisted (SR-10)
- [ ] Privacy policy (Bahasa Indonesia) published
- [ ] Export & delete-account flows working
- [ ] HSTS + HTTPS enforced

---

## 12. Open Security Decisions

| # | Decision | Owner |
| :-- | :--- | :--- |
| 1 | Enable MFA (TOTP) in v1.1? | Product |
| 2 | TiDB Cloud region — Singapore vs Jakarta (data residency) | Eng/Legal |
| 3 | Minimum age / minor handling (UU PDP: under 17 needs guardian consent) | Legal |
| 4 | Shared rate-limiter backend (Upstash/Vercel KV) vs in-process (§5.4) | Eng |
| 5 | Bank aggregation later → BI/OJK licensing (NG out of scope) | Legal |

---

**End of SECURITY-SPEC.md — Part 1 of 1 (Sections 0–12)**
