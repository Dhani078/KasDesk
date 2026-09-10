# KASDESK — Security & Privacy Specification

**Status:** Draft v1.0
**Last Updated:** 2026-09-09
**Authoritative for:** threat model, auth architecture, RLS, secrets, validation, privacy
**Supersedes:** `SECURITY.md` (marked superseded)
**Derived from:** `PRD.md` §10 (NFR-S/P), §11.2/11.3/11.5 (defects)
**Method skills:** `stride-analysis-patterns`, `attack-tree-construction`, `threat-mitigation-mapping`, `security-requirement-extraction`, `auth-implementation-patterns`, `secrets-management`, `sast-configuration`

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
| Password hash | **CRITICAL** | Held by Supabase Auth (bcrypt), never in app DB |
| Session tokens | **CRITICAL** | Short-lived JWT + refresh token |

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
│ TB-2  SEMI-TRUSTED: Next.js server (Vercel edge/node)            │
│   - Server Actions, Route Handlers, middleware.ts                │
│   - Holds ANON key + service-role key (server-only)              │
│   - Enforces Supabase Auth session; calls Supabase as the user   │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS + anon key + user JWT
┌────────────────────────────▼─────────────────────────────────────┐
│ TB-3  TRUSTED: Supabase (Postgres + Auth)                        │
│   - Row Level Security is the REAL authorization boundary        │
│   - RLS policies: USING + WITH CHECK                             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ TB-4  EXTERNAL: Gemini API                                       │
│   - Receives receipt image bytes + prompt                        │
│   - Untrusted in the sense that output must be validated         │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Critical Principle

> **RLS, not the UI, is the authorization boundary.**
> Every table must deny by default and grant only to `auth.uid()`.
> A bug in a Server Action must never be able to leak another user's data.

---

## 2. STRIDE Threat Model

Method: enumerate per element, assign STRIDE category, rate risk, derive mitigation.

### 2.1 STRIDE Categories

| Cat | Question | Control Family |
| :-- | :--- | :--- |
| **S**poofing | Can attacker pretend to be someone else? | Authentication |
| **T**ampering | Can data be modified in transit/at rest? | Integrity |
| **R**epudiation | Can attacker deny actions? | Logging / audit |
| **I**nformation Disclosure | Can attacker access unauthorized data? | Encryption / RLS |
| **D**enial of Service | Can attacker disrupt availability? | Rate limiting |
| **E**levation of Privilege | Can attacker gain higher privileges? | Authorization / RLS |

### 2.2 Threat Catalog

Legend: **L**ikelihood (L/M/H) · **I**mpact (L/M/H) · **R**isk = combined

| ID | Element | STRIDE | Threat | L | I | Risk | Mitigation |
| :-- | :--- | :--: | :--- | :-: | :-: | :--: | :--- |
| T-01 | Supabase Auth | **S** | Credential stuffing / password guessing | M | H | **HIGH** | Supabase built-in rate limiting; strong password policy; consider MFA (v1.1) |
| T-02 | Session | **S** | Stolen refresh token → persistent access | M | H | **HIGH** | HttpOnly cookie storage; refresh rotation; short access-token TTL; `middleware.ts` refresh |
| T-03 | OAuth (Google) | **S** | Account linking confusion | L | M | MED | Supabase handles PKCE; verify `aud`/`iss`; single canonical email |
| T-04 | Server Action | **T** | Attacker crafts request to modify another user's row | M | H | **HIGH** | RLS `WITH CHECK`; Zod validation; never trust client-supplied `user_id` |
| T-05 | Wallet balance | **T** | Balance manipulated without matching transaction | M | H | **HIGH** | **Atomic RPC only** (`log_transaction`); no direct client UPDATE (defect §11.4) |
| T-06 | `amount` field | **T** | Negative/zero amount → balance corruption | M | M | **HIGH** | Zod `.positive()` + DB `CHECK (amount > 0)` (defect §11.3) |
| T-07 | Transaction | **R** | User denies an edit/delete | M | L | MED | Append-only audit log of mutations (v1.1); `updated_at` tracked |
| T-08 | RLS | **I** | Policy missing `WITH CHECK` → cross-user write | M | H | **HIGH** | Mandatory `WITH CHECK` on every policy (PRD §12.12) |
| T-09 | RLS | **I** | Policy missing → whole table readable | L | H | **HIGH** | Deny-by-default; `supabase db advisors` in CI |
| T-10 | Transport | **I** | MITM on public wifi | L | H | MED | HTTPS enforced (HSTS); no mixed content |
| T-11 | Logs | **I** | Financial data leaked into logs/analytics | M | M | **HIGH** | Never log amounts/titles; sanitize; no PII in error messages |
| T-12 | Receipt image | **I** | Image persisted / leaked | M | M | MED | **Never persist** (FR-OCR-7); process in memory, discard |
| T-13 | Gemini prompt | **I/E** | Prompt injection via receipt text | M | M | **HIGH** | Image treated as data; output Zod-validated; no tool-calling |
| T-14 | `/api/scan-receipt` | **D** | Cost DoS — attacker spams OCR | M | M | **HIGH** | Per-user rate limit; monthly cap; auth required |
| T-15 | `/api/scan-receipt` | **D** | Huge image → memory exhaustion | M | M | MED | Max 10 MB; dimension downscale; timeout |
| T-16 | Server Action | **D** | Spam transaction creation | L | L | LOW | Rate limit per user |
| T-17 | RLS | **E** | Anonymous key escalates to service role | L | H | MED | Service-role key **server-only**, never `NEXT_PUBLIC_` |
| T-18 | RPC | **E** | `SECURITY DEFINER` function abused | M | H | **HIGH** | `SET search_path = public, pg_temp`; no dynamic SQL; validate `auth.uid()` inside |
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
│   │   └── 1.3 Replay refresh token [MITIGATED — rotation]
│   ├── 2. Exploit missing RLS [POSSIBLE → must be MITIGATED]
│   │   ├── 2.1 Query table with no policy [MITIGATED — deny-by-default + advisors]
│   │   ├── 2.2 Enumerate via anon key [MITIGATED — auth.uid() = user_id]
│   │   └── 2.3 Write then read via missing WITH CHECK [MITIGATED — mandatory WITH CHECK]
│   ├── 3. Exploit a Server Action [POSSIBLE]
│   │   ├── 3.1 Pass another user_id in payload [MITIGATED — server derives user_id]
│   │   └── 3.2 IDOR on transaction id [MITIGATED — RLS USING on SELECT/UPDATE]
│   └── 4. Client-side leakage [POSSIBLE]
│       ├── 4.1 Sensitive data in localStorage [MITIGATED — memory only]
│       └── 4.2 Data in service-worker cache [MITIGATED — no API caching in SW]
```

**Critical controls:** RLS `USING` + `WITH CHECK` on all tables (T-08, T-09);
server-derived `user_id` (T-04).

### 3.2 AT-02 — Drain / Inflate a Wallet Balance

```
[GOAL] Make a wallet balance wrong without a valid transaction
├── OR
│   ├── 1. Direct UPDATE wallets.balance [POSSIBLE → currently UNMITIGATED]
│   │   └── MITIGATION: revoke UPDATE on balance from authenticated role
│   │       + all mutations go through log_transaction() RPC (defect §11.4)
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
| SR-01 | All tables have RLS enabled with deny-by-default | T-08, T-09 | **P0** | `supabase db advisors`; policy test suite |
| SR-02 | Every policy includes `WITH CHECK`, not just `USING` | T-08 | **P0** | Automated policy test: cross-user write returns error |
| SR-03 | `user_id` always derived server-side from `auth.uid()`, never from client payload | T-04 | **P0** | Code review + unit test rejects client `user_id` |
| SR-04 | Wallet balance mutated **only** via `log_transaction()` RPC | T-05 | **P0** | Revoke direct UPDATE; integration test |
| SR-05 | `amount > 0` enforced in Zod **and** DB CHECK | T-06 | **P0** | Unit test (Zod) + SQL constraint test |
| SR-06 | `middleware.ts` refreshes Supabase session on every request | T-02 | **P0** | E2E: session survives 30 min idle |
| SR-07 | Refresh token rotation enabled; tokens in HttpOnly cookies | T-02 | **P0** | Manual inspection of cookie flags |
| SR-08 | Service-role key never exposed to client; no `NEXT_PUBLIC_` prefix | T-17 | **P0** | Grep CI check; secret scanning |
| SR-09 | All RPC functions are `SECURITY DEFINER` with `SET search_path` pinned | T-18 | **P0** | SQL review; `search_path` assertion |
| SR-10 | Receipt images never written to disk/Storage; processed in memory | T-12 | **P0** | Code review; no Storage bucket created |
| SR-11 | OCR output validated by Zod before use; reject on schema failure | T-13 | **P0** | Unit test with malformed model output |
| SR-12 | OCR endpoint requires authentication | T-14 | **P0** | E2E: unauthenticated POST → 401 |
| SR-13 | OCR endpoint rate-limited per user (e.g. 20/hour) + monthly cap | T-14 | **P1** | Rate-limit test |
| SR-14 | Image upload capped at 10 MB, downscaled before API call | T-15 | **P1** | Unit test rejects >10 MB |
| SR-15 | No financial data (amounts, titles, merchant) in logs or analytics | T-11 | **P0** | Log review; grep in CI for `console.log` of payloads |
| SR-16 | Password policy: min 8 chars; Supabase breach protection on | T-01 | **P1** | Config check |
| SR-17 | HTTPS enforced; HSTS enabled | T-10 | **P1** | Header check in E2E |
| SR-18 | Zustand store cleared on logout; no sensitive data persisted | T-19 | **P1** | Unit test on logout |
| SR-19 | Offline queue expires after 30 days; re-validated on replay | T-20 | **P2** | Unit test |
| SR-20 | Lockfile committed; `npm audit` in CI; Dependabot enabled | T-21 | **P1** | CI config |
| SR-21 | `.env*` git-ignored; `.env.example` complete and secret-free | T-22 | **P0** | `git check-ignore`; secret scan |
| SR-22 | Error messages generic; no stack traces or PII to client | T-11 | **P1** | Error-handling test |

---

## 5. Authentication Architecture

### 5.1 Flows

| Flow | Mechanism |
| :--- | :--- |
| Email + password | Supabase Auth; bcrypt hash; PKCE not needed (direct) |
| Google OAuth | Supabase OAuth with **PKCE**; redirect to `/auth/callback` |
| Session | Access JWT (short TTL) + refresh token (rotating) |
| Storage | Cookies managed by `@supabase/ssr` (HttpOnly, Secure, SameSite=Lax) |

### 5.2 `middleware.ts` — **FIXES PRD §11.2** (currently missing)

Without it, sessions silently expire because `lib/supabase/server.ts` swallows the
`setAll` error.

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: must call getUser() to refresh the session
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected =
    request.nextPathname !== '/login' &&
    !request.nextPathname.startsWith('/auth')

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 5.3 Rules

- **Never** call `supabase.auth.getSession()` on the server for authorization — it reads
  the cookie without revalidating. Use `getUser()` (revalidates with Auth server).
- Server Actions must re-fetch the user; never trust a client-passed id.
- Token TTL: access ~1 h, refresh rotating with reuse detection.
- Logout calls `supabase.auth.signOut()` and clears the Zustand store (SR-18).

---

## 6. Authorization: RLS Hardening

### 6.1 Policy Pattern (all tables)

```sql
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE  ROW LEVEL SECURITY;  -- applies to table owner too

CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_update_own" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_delete_own" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);
```

### 6.2 Hardening Checklist

- [ ] `ENABLE` **and** `FORCE` RLS on every user table
- [ ] `WITH CHECK` present on every INSERT/UPDATE policy (SR-02)
- [ ] No policy uses `USING (true)`
- [ ] `wallets.balance` — revoke direct UPDATE from `authenticated`
- [ ] `SECURITY DEFINER` RPCs pinned: `SET search_path = public, pg_temp`
- [ ] Run `supabase db advisors` (unindexed FKs, RLS gaps, security defects)
- [ ] Automated policy tests in CI (see §10)

### 6.3 Revoking direct balance mutation (SR-04)

```sql
REVOKE UPDATE (balance) ON public.wallets FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.log_transaction(jsonb) TO authenticated;
```

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
3. Server-only secrets (service role, Gemini key) carry **no** `NEXT_PUBLIC_` prefix.
4. Rotate on suspicion; rotate Gemini key if usage looks anomalous.
5. Use platform secret storage (Vercel env vars / Supabase dashboard), not files in prod.
6. Add a pre-commit secret-scanning hook.

### 8.2 Required `.env.example` — **FIXES PRD §11.5**

```bash
# ── Supabase ─────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=          # https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # public anon key (safe to expose, RLS-protected)
# DO NOT expose; server-only:
SUPABASE_SERVICE_ROLE_KEY=         # server-only, bypasses RLS

# ── Gemini AI (receipt OCR) ──────────────────────────  ← currently missing
GEMINI_API_KEY=                    # server-only

# ── App ─────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=              # http://localhost:3000 | https://kasdesk.app
```

Rules:
- `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` must **never** be `NEXT_PUBLIC_`.
- CI must fail if a `NEXT_PUBLIC_` var name matches `/KEY|SECRET|TOKEN|PASSWORD/`.

### 8.3 Verification

```bash
git check-ignore -v .env.local     # must show it is ignored
grep -rn "service_role\|GEMINI_API_KEY" app components lib   # must be empty
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

**Deletion cascade:** deleting `auth.users` cascades via `ON DELETE CASCADE` on
`user_id` across `wallets`, `transactions`, `vaults`, `debts`, `categories`.

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
| DB advisors | `supabase db advisors` | RLS disabled, unindexed FK, security defect |
| RLS policy tests | pgTAP / Supabase test | Cross-user read/write succeeds |
| License check | `license-checker` | Copyleft incompatibility |

### 10.1 RLS Policy Test (example)

```ts
// tests/rls.test.ts
it('user A cannot read user B transactions', async () => {
  const { data } = await asUserA.from('transactions')
    .select('*').eq('user_id', userB.id)
  expect(data).toEqual([])
})

it('user A cannot insert a row owned by user B', async () => {
  const { error } = await asUserA.from('transactions')
    .insert({ user_id: userB.id, amount: 1000, ... })
  expect(error).toBeTruthy()   // WITH CHECK violation
})
```

---

## 11. Launch Security Checklist

Mapped to the defects in PRD §11.

- [ ] **§11.1** `.env.local` created from `.env.example` with real values (not committed)
- [ ] **§11.2** `middleware.ts` exists and refreshes sessions (SR-06)
- [ ] **§11.3** `amount` has `.positive()` in Zod **and** DB CHECK (SR-05)
- [ ] **§11.4** `log_transaction()` RPC is the only balance mutator; triggers reverse on
      delete/update (SR-04)
- [ ] **§11.5** `GEMINI_API_KEY` documented in `.env.example`; dependency installed
- [ ] **§11.12** Client never passes `user_id`; server derives it (SR-03)
- [ ] All tables: RLS enabled + forced, `WITH CHECK` everywhere (SR-01, SR-02)
- [ ] `supabase db advisors` clean
- [ ] RLS policy tests passing
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
| 2 | Supabase region — Singapore vs Jakarta (data residency) | Eng/Legal |
| 3 | Minimum age / minor handling (UU PDP: under 17 needs guardian consent) | Legal |
| 4 | Self-host vs Supabase Cloud (residency + cost) | Eng |
| 5 | Bank aggregation later → BI/OJK licensing (NG out of scope) | Legal |

---

**End of SECURITY-SPEC.md — Part 1 of 1 (Sections 0–12)**
