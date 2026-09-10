# KASDESK — QA, Testing, CI/CD & Reliability Strategy

**Status:** Draft v1.0
**Last Updated:** 2026-09-09
**Authoritative for:** test strategy, CI/CD pipeline, SLOs, incident response
**Derived from:** `PRD.md` §8.4 (guardrail metrics), §11 (known defects)
**Stack:** Next.js 16.3 · React 19 · TypeScript strict · Supabase · Zustand · Zod 4 · Tailwind v4
**⚠️ No test framework installed yet.**
**Method skills:** `e2e-testing-patterns`, `javascript-testing-patterns`, `code-review-excellence`, `multi-reviewer-patterns`, `error-handling-patterns`, `deployment-pipeline-design`, `github-actions-templates`, `slo-implementation`, `incident-runbook-templates`, `dependency-upgrade`

---

## 0. Current State & Mandate

| Aspect | Status |
| :--- | :--- |
| Test framework | **NONE installed** |
| Lint | ESLint (from create-next-app) |
| Typecheck | `tsc --noEmit` — passes |
| Build | `npm run build` — exits 0 |
| CI | **None** |
| Test coverage | **0%** |

> A green build proves the code **compiles**, not that it **works**. PRD §11 lists 12
> known defects that the build does not catch. This document is the remediation plan.

---

## 1. Test Strategy & Pyramid

### 1.1 Pyramid

```
            /\
           /E2E\           ~10%  Playwright — critical journeys only
          /─────\
         / Integr\         ~30%  Testing Library + Supabase local
        /────────\
       /Unit Tests\        ~60%  Vitest — fast, isolated, many
      /────────────\
```

**Target ratios:** 60% unit · 30% integration · 10% E2E.

### 1.2 What Belongs Where

| Level | Scope | Examples |
| :--- | :--- | :--- |
| **Unit** | Pure functions, no I/O | Zod schemas, currency format/parse, Safe Daily Spend, category logic |
| **Integration** | Components + DB | Quick Log sheet rendering, Server Action + Supabase local, RLS policies |
| **E2E** | Full journeys | Login → log transaction → see it in feed; offline queue; scan receipt |

### 1.3 Tooling Decision (justified)

| Tool | Purpose | Why |
| :--- | :--- | :--- |
| **Vitest** | Unit + component | Native ESM/TS, fast, Jest-compatible API, Vite-powered (matches Next's bundler era) |
| **@testing-library/react** | Component tests | Encourages accessibility-first queries (`getByRole`) |
| **Playwright** | E2E | Real browsers, mobile emulation, network offline simulation, trace viewer |
| **Supabase CLI (local)** | DB integration | Real Postgres + RLS without touching prod |
| **pgTAP** (optional) | RLS policy tests | Assert policies in-database |

**Not chosen:** Jest (slower ESM setup), Cypress (heavier; Playwright's offline + mobile
emulation is better for a PWA).

### 1.4 Critical Paths (must always be green)

1. **P1 — 3-second logging** (FR-LOG-1..10) — the product's core promise
2. **P2 — Auth & session** (login, refresh, logout)
3. **P3 — Offline queue** (FR-OFF-2, FR-LOG-11)
4. **P4 — Receipt scan** (PRD §9)
5. **P5 — Balance integrity** (atomic RPC + triggers)

---

## 2. Unit Tests (Vitest)

### 2.1 Zod Schemas

```ts
// tests/unit/schemas.test.ts
import { describe, it, expect } from 'vitest'
import { TransactionSchema } from '@/lib/schemas'

describe('TransactionSchema', () => {
  it('rejects zero amount', () => {
    expect(TransactionSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false)
  })

  it('rejects negative amount', () => {   // defect §11.3
    expect(TransactionSchema.safeParse({ ...valid, amount: -5000 }).success).toBe(false)
  })

  it('accepts positive amount', () => {
    expect(TransactionSchema.safeParse({ ...valid, amount: 15000 }).success).toBe(true)
  })

  it('requires to_wallet_id for transfer', () => {
    const r = TransactionSchema.safeParse({ ...valid, type: 'transfer' })
    expect(r.success).toBe(false)
  })

  it('rejects transfer to the same wallet', () => {
    const r = TransactionSchema.safeParse({
      ...valid, type: 'transfer', to_wallet_id: valid.wallet_id,
    })
    expect(r.success).toBe(false)
  })

  it('trims and bounds the title', () => {
    expect(TransactionSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false)
    expect(TransactionSchema.safeParse({ ...valid, title: 'a'.repeat(121) }).success).toBe(false)
  })
})
```

### 2.2 Currency

```ts
// tests/unit/currency.test.ts
describe('formatIDR', () => {
  it.each([
    [0, '0'],
    [1000, '1.000'],
    [14250000, '14.250.000'],
  ])('formats %i as %s', (input, expected) => {
    expect(formatIDR(input)).toBe(expected)
  })
})

describe('parseIDRInput', () => {
  it.each([
    ['12.000', 12000],
    ['12,000', 12000],   // comma decimal
    ['12000', 12000],
    ['Rp 15.000', 15000],
    ['', 0],
    ['abc', 0],
  ])('parses %s as %i', (input, expected) => {
    expect(parseIDRInput(input)).toBe(expected)
  })
})
```

### 2.3 Safe Daily Spend (PRD §6.7)

Formula: `safe_daily_spend = max(0, (total_liquid - vault_allocations - upcoming_debts) / days_remaining_in_month)`

```ts
// tests/unit/safe-spend.test.ts
describe('calculateSafeDailySpend', () => {
  it('divides free cash by remaining days', () => {
    expect(calculateSafeDailySpend({
      totalLiquid: 3_000_000,
      vaultAllocations: 600_000,
      upcomingDebts: 0,
      daysRemaining: 20,
    })).toBe(120_000)
  })

  it('never returns negative', () => {
    expect(calculateSafeDailySpend({
      totalLiquid: 100_000, vaultAllocations: 500_000,
      upcomingDebts: 0, daysRemaining: 10,
    })).toBe(0)
  })

  it('handles daysRemaining = 0 by clamping to 1', () => {
    expect(calculateSafeDailySpend({
      totalLiquid: 100_000, vaultAllocations: 0,
      upcomingDebts: 0, daysRemaining: 0,
    })).toBe(100_000)
  })

  it('subtracts upcoming debts', () => {
    expect(calculateSafeDailySpend({
      totalLiquid: 1_000_000, vaultAllocations: 0,
      upcomingDebts: 200_000, daysRemaining: 10,
    })).toBe(80_000)
  })
})
```

### 2.4 Gemini Schema

```ts
describe('GeminiOCRResponseSchema', () => {
  it('rejects confidence outside 0..1', () => {
    expect(GeminiOCRResponseSchema.safeParse({ ...valid, confidence_score: 1.5 }).success).toBe(false)
  })
  it('accepts empty items for unreadable receipts', () => {
    expect(GeminiOCRResponseSchema.safeParse({ ...valid, items: [] }).success).toBe(true)
  })
  it('rejects missing detected_total', () => {
    const { detected_total, ...rest } = valid
    expect(GeminiOCRResponseSchema.safeParse(rest).success).toBe(false)
  })
})
```

---

## 3. Component Tests (Testing Library)

### 3.1 Quick Log Sheet — the critical component

```tsx
// tests/component/QuickLogSheet.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuickLogSheet } from '@/components/QuickLogSheet'

describe('QuickLogSheet', () => {
  it('autofocuses the amount input', () => {
    render(<QuickLogSheet open onClose={vi.fn()} onSubmit={vi.fn()} wallets={[bca]} />)
    expect(screen.getByLabelText(/jumlah/i)).toHaveFocus()
  })

  it('uses a numeric keypad input', () => {
    render(<QuickLogSheet open ... />)
    expect(screen.getByLabelText(/jumlah/i)).toHaveAttribute('inputmode', 'decimal')
  })

  it('defaults the wallet to the last-used one', () => {
    render(<QuickLogSheet open lastWalletId={gopay.id} ... />)
    expect(screen.getByRole('combobox')).toHaveValue(gopay.id)
  })

  it('shows the last-used category first', () => {
    render(<QuickLogSheet open lastCategory="MAKAN" ... />)
    const chips = screen.getAllByRole('radio')
    expect(chips[0]).toHaveTextContent('MAKAN')
  })

  it('submits amount + category + wallet', async () => {
    const onSubmit = vi.fn()
    render(<QuickLogSheet open onSubmit={onSubmit} ... />)
    fireEvent.change(screen.getByLabelText(/jumlah/i), { target: { value: '15000' } })
    fireEvent.click(screen.getByRole('radio', { name: 'MAKAN' }))
    fireEvent.click(screen.getByRole('button', { name: /simpan/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 15000, category_tag: 'MAKAN' })
    ))
  })

  it('does not require a note', async () => { /* note empty → submit succeeds */ })

  it('has accessible labels on all controls', () => {
    render(<QuickLogSheet open ... />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })
})
```

### 3.2 BottomNav

```tsx
describe('BottomNav', () => {
  it('links to all four routes (fixes defects §11.9)', () => {
    render(<BottomNav />)
    expect(screen.getByRole('link', { name: /dompet/i })).toHaveAttribute('href', '/wallets')
    expect(screen.getByRole('link', { name: /target/i })).toHaveAttribute('href', '/vaults')
    expect(screen.getByRole('link', { name: /wawasan/i })).toHaveAttribute('href', '/insights')
  })

  it('FAB opens the Quick Log (fixes defect §11.10)', () => {
    const onAdd = vi.fn()
    render(<BottomNav onAdd={onAdd} />)
    fireEvent.click(screen.getByRole('button', { name: /catat/i }))
    expect(onAdd).toHaveBeenCalled()
  })

  it('has aria-labels on icon-only controls', () => { /* §NR-A11Y-5 */ })
})
```

### 3.3 Optimistic Update & Rollback

```tsx
it('shows the transaction immediately (optimistic)', async () => {
  render(<TransactionFeed />)
  fireEvent.click(screen.getByRole('button', { name: /simpan/i }))
  await waitFor(() => expect(screen.getByText('Nasi Goreng')).toBeInTheDocument())
})

it('rolls back when the server rejects', async () => {
  server.use(http.post('/api/...', () => HttpResponse.json({ error: 'x' }, { status: 500 })))
  render(<TransactionFeed />)
  fireEvent.click(screen.getByRole('button', { name: /simpan/i }))
  await waitFor(() => expect(screen.queryByText('Nasi Goreng')).toBeNull())
  expect(await screen.findByRole('alert')).toHaveTextContent(/gagal/i)
})
```

---

## 4. E2E Tests (Playwright)

### 4.1 P1 — The 3-Second Logging Path (with `t_log` assertion)

```ts
// e2e/log-transaction.spec.ts
import { test, expect } from '@playwright/test'

test('user logs an expense in under 3 seconds', async ({ page }) => {
  await login(page)
  await page.goto('/')

  const start = Date.now()

  // 1 tap to open
  await page.getByRole('button', { name: /catat/i }).click()

  // amount is autofocused — type immediately
  await page.keyboard.type('35000')
  await page.getByRole('radio', { name: 'MAKAN' }).click()
  await page.getByRole('button', { name: /simpan/i }).click()

  // optimistic: visible right away
  await expect(page.getByText('35.000')).toBeVisible()

  const t_log = Date.now() - start
  expect(t_log).toBeLessThanOrEqual(3000)      // NR-PERF-1
})

test('transaction persists after reload', async ({ page }) => {
  await login(page); await page.goto('/')
  await logExpense(page, 35000, 'MAKAN')
  await page.reload()
  await expect(page.getByText('35.000')).toBeVisible()
})
```

### 4.2 P3 — Offline Queue

```ts
test('logs offline and syncs when back online', async ({ page, context }) => {
  await login(page); await page.goto('/')

  await context.setOffline(true)
  await logExpense(page, 20000, 'TRANSPORT')
  await expect(page.getByText(/menunggu sinkron/i)).toBeVisible()   // optimistic + queued

  await context.setOffline(false)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByText(/tersimpan/i)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/menunggu sinkron/i)).toBeHidden()
})
```

### 4.3 P2 — Auth

```ts
test('unauthenticated user is redirected to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('session survives after 30 minutes idle (fixes §11.2)', async ({ page }) => {
  await login(page)
  await page.clock.install()
  await page.clock.fastForward('30:00')
  await page.goto('/')
  await expect(page).toHaveURL('/')      // NOT redirected to login
})
```

### 4.4 P5 — Balance Integrity

```ts
test('wallet balance changes after a transaction (fixes §11.4)', async ({ page }) => {
  await login(page); await page.goto('/wallets')
  const before = await getBalance(page, 'BCA')

  await page.goto('/')
  await logExpense(page, 50000, 'MAKAN')

  await page.goto('/wallets')
  const after = await getBalance(page, 'BCA')
  expect(after).toBe(before - 50000)
})

test('deleting a transaction reverses the balance', async ({ page }) => {
  /* create → delete → balance returns to original */
})
```

### 4.5 P4 — Receipt Scan

```ts
test('unauthenticated scan is rejected', async ({ request }) => {
  const res = await request.post('/api/scan-receipt', { multipart: { image: file } })
  expect(res.status()).toBe(401)
})

test('oversized image is rejected', async ({ request }) => {
  await login(request)
  const res = await request.post('/api/scan-receipt', { multipart: { image: bigFile } })
  expect(res.status()).toBe(400)
})

test('happy path auto-fills the Quick Log', async ({ page }) => {
  await login(page); await page.goto('/')
  await page.getByRole('button', { name: /scan/i }).click()
  await page.setInputFiles('input[type=file]', 'fixtures/indomaret.jpg')
  await expect(page.getByLabelText(/jumlah/i)).toHaveValue('12210')
  await expect(page.getByRole('radio', { name: 'MAKAN' })).toBeChecked()
})
```

### 4.6 Accessibility Smoke

```ts
test('no axe violations on Home', async ({ page }) => {
  await login(page); await page.goto('/')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('user can zoom (fixes §11.7)', async ({ page }) => {
  await page.goto('/')
  const viewportMeta = await page.locator('meta[name=viewport]').getAttribute('content')
  expect(viewportMeta).not.toMatch(/user-scalable=no|maximum-scale=1/)
})
```

---

## 5. Database & RLS Testing

### 5.1 Local Supabase

```bash
supabase start          # local Postgres + Auth + Studio
supabase db reset       # apply migrations + seed
supabase test db        # run pgTAP tests
supabase db advisors    # security + performance lint
```

### 5.2 RLS Policy Tests (SR-01, SR-02)

```ts
// tests/integration/rls.test.ts
describe('RLS', () => {
  it('user A cannot read user B transactions', async () => {
    const { data } = await asUserA.from('transactions').select().eq('user_id', userB.id)
    expect(data).toEqual([])
  })

  it('user A cannot insert a row owned by user B (WITH CHECK)', async () => {
    const { error } = await asUserA.from('transactions')
      .insert({ user_id: userB.id, amount: 1000, ... })
    expect(error).toBeTruthy()
  })

  it('every table has RLS enabled', async () => { /* query pg_tables */ })
})
```

### 5.3 Atomic RPC Tests (P5)

```ts
it('log_transaction updates the balance atomically', async () => { /* balance changes */ })
it('rejects negative amount at the DB level', async () => { /* CHECK violation */ })
it('transfer updates both wallets', async () => { /* from −, to + */ })
it('deleting a transaction reverses the balance', async () => { /* trigger */ })
it('concurrent transfers do not race', async () => { /* parallel, assert final */ })
```

---

## 6. Error Handling Taxonomy

Per `error-handling-patterns`: use a **discriminated union** (Result type), never throw
across the server/client boundary.

```ts
export type ActionResponse<T> =
  | { success: true;  data: T }
  | { success: false; error: { code: string; message: string; field?: string } }
```

### 6.1 Error Codes

| Code | User message (ID) | Behavior |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | Field-level message | Highlight the field |
| `UNAUTHENTICATED` | "Sesi berakhir. Silakan masuk lagi." | Redirect to `/login` |
| `INSUFFICIENT_BALANCE` | "Saldo tidak cukup." | Block, offer adjust |
| `RLS_DENIED` | "Tidak dapat mengakses data ini." | Log + toast |
| `OCR_INVALID_RESPONSE` | "Struk tidak terbaca. Catat manual?" | Offer manual |
| `OCR_RATE_LIMITED` | "Terlalu banyak scan. Coba lagi nanti." | Retry later |
| `NETWORK_OFFLINE` | "Mode offline — tersimpan lokal." | Queue |
| `UNKNOWN` | "Terjadi kesalahan. Coba lagi." | Retry |

### 6.2 Rules

- Never leak stack traces or internal messages to the client (SR-22).
- Never log financial values (SR-15).
- Optimistic updates **must** have a rollback path, tested (§3.3).
- Every network call has a timeout.

---

## 7. Code Review Checklist (per `multi-reviewer-patterns`)

Every PR is reviewed across these dimensions:

| # | Dimension | Check |
| :-- | :--- | :--- |
| 1 | **Correctness** | Does it do what the requirement says? Edge cases handled? |
| 2 | **Security** | Zod validated? `user_id` server-derived? RLS respected? No secrets? |
| 3 | **Data integrity** | Balance mutations via RPC only? Atomic? |
| 4 | **Type safety** | No `any`; strict mode clean |
| 5 | **Tests** | New logic has tests; critical paths covered |
| 6 | **Accessibility** | Labels, contrast, focus, touch targets |
| 7 | **Design system** | Tokens only; mono tabular numbers; no anti-slop violations |
| 8 | **Performance** | No N+1; no blocking on the log path |
| 9 | **Error handling** | Result union; rollback; user-facing message |
| 10 | **Observability** | Errors logged (without PII); metrics where relevant |

**Reviewer roles:** one reviewer for correctness+security, one for design+a11y.

---

## 8. CI/CD Pipeline

### 8.1 Stages & Gates

```
┌──────────┐   ┌──────────┐   ┌────────┐   ┌───────┐   ┌────────┐
│ INSTALL  │──▶│ TYPCHECK │──▶│  LINT  │──▶│ UNIT  │──▶│ BUILD  │
└──────────┘   └──────────┘   └────────┘   └───────┘   └────────┘
                                                            │
        ┌───────────────┬───────────────┬──────────────────┤
        ▼               ▼               ▼                  ▼
   ┌──────────┐   ┌──────────┐   ┌───────────┐   ┌──────────────┐
   │   E2E    │   │  DB/RLS  │   │ SECURITY  │   │  LIGHTHOUSE  │
   │(Playwright)│ │ (advisors)│  │(secrets,  │   │  (perf/a11y) │
   └──────────┘   └──────────┘   │ npm audit)│   └──────────────┘
                                  └───────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │   DEPLOY    │
                                 └─────────────┘
```

**Merge is blocked if any gate fails.**

| Gate | Command | Blocks on |
| :--- | :--- | :--- |
| Typecheck | `tsc --noEmit` | Any TS error |
| Lint | `next lint` | Error-level violations |
| Unit | `vitest run` | Any failure / coverage drop |
| Build | `npm run build` | Build failure |
| E2E | `playwright test` | Critical path failure |
| DB/RLS | `supabase db advisors` + policy tests | RLS gap, unindexed FK |
| Security | gitleaks + `npm audit` | Secret or high vuln |
| Lighthouse | LHCI | Perf < 90 or A11y < 95 |

### 8.2 GitHub Actions Workflow (ready to paste)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '22'

jobs:
  quality:
    name: Typecheck · Lint · Unit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - name: Typecheck
        run: npx tsc --noEmit
      - name: Lint
        run: npm run lint
      - name: Unit tests
        run: npx vitest run --coverage
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

  security:
    name: Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Secret scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/setup-node@v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: 'npm' }
      - run: npm ci
      - name: npm audit
        run: npm audit --audit-level=high

  e2e:
    name: E2E (Playwright)
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ env.NODE_VERSION }}, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Start Supabase local
        run: npx supabase start
      - name: Run E2E
        run: npx playwright test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  db:
    name: DB & RLS
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase db reset
      - name: Advisors
        run: supabase db advisors --level error
      - name: RLS policy tests
        run: npx vitest run tests/integration/rls.test.ts
```

### 8.3 Branch Strategy

| Branch | Purpose |
| :--- | :--- |
| `main` | Production; protected; requires green CI + review |
| `develop` | Integration |
| `feat/*`, `fix/*` | Feature branches → PR to `develop` |

---

## 9. SLOs, SLIs & Error Budgets

Per `slo-implementation`, adapted to Vercel/Supabase.

### 9.1 SLIs & SLOs

| SLI | Definition | SLO (30 d) |
| :--- | :--- | :--- |
| **Availability** | Non-5xx / total requests | **99.5%** |
| **Log latency (t_log)** | p50 end-to-end logging | **≤ 3 s** |
| **Log latency p95** | p95 | ≤ 6 s |
| **Home load (LCP)** | p75 LCP on mobile | **≤ 2.5 s** |
| **Action success rate** | successful Server Actions / total | **≥ 99%** |
| **OCR success rate** | valid parse / attempts | ≥ 90% |
| **Sync success rate** | queued items synced / queued | ≥ 99% |
| **RLS correctness** | policy tests passing | **100%** (no budget) |

### 9.2 Error Budget

| SLO | Monthly budget (99.5%) |
| :--- | :--- |
| Availability | ~3 h 39 m downtime |
| Log latency | 5% of logs may exceed 3 s |

**Policy:** if the budget is exhausted, feature work pauses; reliability work takes
priority until the budget recovers.

### 9.3 Alerting Thresholds

| Alert | Condition | Severity |
| :--- | :--- | :--- |
| Error rate spike | 5xx > 2% over 5 min | **P1** |
| p95 t_log regression | > 6 s for 10 min | **P2** |
| OCR failure spike | success < 80% over 30 min | **P2** |
| OCR cost | > 80% of monthly cap | **P2** |
| Auth failures | login failure rate > 30% | **P1** |
| DB advisors | any error-level finding | **P2** |
| Balance mismatch | reconciliation job detects drift | **P0** |

### 9.4 Reconciliation Job (P0 safeguard)

Nightly: for each wallet, compare `wallets.balance` against
`SUM(signed transaction amounts)`. Any drift → **P0 alert**.
This is the safety net for the atomic-RPC requirement (§11.4).

---

## 10. Incident Response

### 10.1 Severity Levels

| Sev | Definition | Response | Examples |
| :-- | :--- | :--- | :--- |
| **P0** | Data loss/corruption, security breach, total outage | Immediate, all hands | Balance corruption, RLS leak |
| **P1** | Core feature down, many users | < 30 min | Cannot log transactions, auth down |
| **P2** | Degraded / few users | < 4 h | OCR failing, slow load |
| **P3** | Minor / cosmetic | Next business day | UI glitch |

### 10.2 Runbook Template

```markdown
# Incident: <title>

**Severity:** P<0-3>          **Status:** Investigating | Mitigating | Resolved
**Detected:** <time>          **Detected by:** <alert | user report>
**Incident Commander:** <name>

## Impact
- Users affected: <n / %>
- Feature affected: <...>
- Data integrity: <yes/no — if yes, escalate to P0>

## Timeline
- HH:MM — Detected
- HH:MM — Acknowledged
- HH:MM — Mitigation applied
- HH:MM — Resolved

## Root Cause
<concise>

## Mitigation
<what was done>

## Remediation (prevent recurrence)
- [ ] <action> — owner — due

## Data/Security Impact (UU PDP)
- Personal data involved? <yes/no>
- Notification required within 3×24h? <yes/no>
- Authorities notified: <time>
- Users notified: <time>
```

### 10.3 Common Runbooks Needed

1. **Balance corruption** — stop writes, run reconciliation, restore from backup, patch.
2. **Auth outage** — check Supabase status, verify middleware, communicate.
3. **OCR cost runaway** — disable endpoint via feature flag, rotate key, investigate.
4. **RLS leak** — **P0**, revoke keys, patch policy, audit access logs, UU PDP notify.

### 10.4 Feature Flags

Kill switches must exist for: OCR scan, offline queue, insights computation.
An incident should be mitigable **without a redeploy**.

---

## 11. Dependency Upgrade Procedure

Next 16 / React 19 / Tailwind 4 are all majors — follow `dependency-upgrade` strictly.

### 11.1 Steps

1. **Audit** — `npm outdated`; list majors, read changelogs/migration guides.
2. **Plan order** — never two majors at once. Order: `react` → `next` → `tailwind` → others.
3. **Branch** — `chore/upgrade-next-16`.
4. **Codemods** — run official codemods (`npx @next/codemod@latest ...`).
5. **Typecheck** — fix type errors.
6. **5-layer validation:**
   - `tsc --noEmit` ✅
   - lint ✅
   - unit tests ✅
   - build ✅
   - **E2E on critical paths** ✅
7. **Manual smoke** on a real device (PWA install, offline, scan).
8. **Lockfile rollback plan** — know the exact `git revert` command before merging.
9. **Staged rollout** — deploy to preview, then production.

### 11.2 Automation

- **Dependabot** — weekly, grouped minor/patch PRs.
- **Renovate** (optional) — gate majors behind manual approval.
- Never auto-merge a major.

---

## 12. Definition of Done

A story is Done when:

- [ ] Requirements implemented and manually verified
- [ ] Zod validation on all inputs
- [ ] Unit tests written and passing
- [ ] Component/E2E test added if it touches a critical path
- [ ] `tsc --noEmit` clean
- [ ] Lint clean
- [ ] Build succeeds
- [ ] A11y checked (labels, contrast, focus, touch targets)
- [ ] Design tokens used (no raw hex, mono tabular numbers)
- [ ] Error handling uses the `ActionResponse` union with rollback
- [ ] No financial data in logs
- [ ] Code reviewed (2 dimensions minimum)
- [ ] Docs updated

### 12.1 Release Checklist — mapped to PRD §11 defects

| Defect | Verification |
| :--- | :--- |
| **§11.1** `.env.local` missing | App boots with real Supabase creds; login works |
| **§11.2** no `middleware.ts` | E2E: session survives 30 min idle (§4.3) |
| **§11.3** `amount` no `.positive()` | Unit: 0 and −5000 rejected (§2.1) |
| **§11.4** balance never updates | E2E: balance changes after transaction; delete reverses (§4.4) |
| **§11.5** Gemini dep/env missing | `GEMINI_API_KEY` in `.env.example`; scan E2E passes |
| **§11.6** `pb-safe` dead class | `grep -c "safe-area-inset" .next/static/css/*.css` ≥ 1 |
| **§11.7** `userScalable: false` | E2E: viewport meta has no `user-scalable=no` (§4.6) |
| **§11.8** PWA icons 404 | `public/icons/icon-192x192.png` & `512x512` exist; Lighthouse installable |
| **§11.9** 3 routes 404 | E2E: `/wallets`, `/vaults`, `/insights` return 200 |
| **§11.10** FAB no handler | Component test: clicking FAB opens Quick Log (§3.2) |
| **§11.11** name mismatch | `package.json` = `kasdesk`; metadata title = `KASDESK` |
| **§11.12** no atomic RPC | RLS/RPC test: only `log_transaction()` mutates balance |

### 12.2 Test Coverage Targets

| Area | Target |
| :--- | :--- |
| `lib/` (schemas, currency, calc) | **≥ 90%** |
| Server Actions / RPC | **≥ 85%** |
| Critical components | **≥ 80%** |
| Overall | ≥ 70% (raise over time) |

---

## 13. Immediate Next Actions

1. Install: `npm i -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @playwright/test @axe-core/playwright`
2. Add scripts: `test`, `test:watch`, `test:e2e`, `test:coverage`
3. Write the Zod + currency unit tests (§2.1, §2.2) — highest value first
4. Write the Quick Log component test (§3.1)
5. Write the `t_log` E2E test (§4.1) — proves the core promise
6. Add the nightly balance reconciliation job (§9.4)
7. Wire up `.github/workflows/ci.yml` (§8.2)

---

**End of QA-STRATEGY.md**
