# KASDESK — Product Context (machine-readable mirror)

> This file is a **mirror** of `PRD.md` in the structure mandated by the
> `context-driven-development` skill. `PRD.md` is authoritative. If the two disagree,
> `PRD.md` wins and this file must be updated.
>
> Best practice applied: *"Read context first"*, *"Small updates"*, *"Version context"*.

---

## product.md

### Name
KASDESK (formerly codenamed "Vaultify" — retired)

### One-sentence definition
A mobile-first web app for Indonesians to record income and expenses in under 3 seconds,
and see exactly how much they can safely spend today.

### Problem
Indonesian consumers manage money across fragmented accounts (cash + multiple banks +
multiple e-wallets). Existing tools fail because logging friction causes abandonment
within days. Users do not need a budget — they need to know "can I buy this today?".

### Solution / Four Pillars
| Pillar | Domain model | Promise |
| :--- | :--- | :--- |
| Arus Kas | `income \| expense \| transfer` | Catat dalam 3 detik |
| Dompet | `cash \| bank \| e-wallet` | Semua rekening satu layar |
| Target | `target_amount` / `current_amount` | Tabungan terlihat maju |
| Utang | `piutang \| utang` | Tak ada utang terlupa |

### Users
- **Primary (Andi):** 22–35, urban Indonesia, irregular income Rp 3–15 jt, mid-range
  Android, has abandoned 2–3 money apps before.
- **Secondary (Sinta):** active split-bill / utang-piutang tracker.
- **Tertiary (Budi):** saving toward a concrete purchase.

### Platform
PWA, portrait-primary, 390×844 primary viewport, one-handed thumb-arc ergonomics,
offline-tolerant.

### Goals
- G1: p50 time-to-log ≤ 3s
- G2: safe-daily-spend viewed ≥ 4×/week
- G3: ≥ 90% users create ≥ 2 wallets
- G4: ≥ 30% users create ≥ 1 debt
- G5: ≥ 40% users create ≥ 1 vault
- G6: core logging works offline

### Non-goals (v1)
Bank aggregation · investment/crypto · multi-currency · monetization · shared accounts ·
native apps · per-category budgeting · receipt image retention · desktop layout · social.

### North Star
**WLTAU** — Weekly Logged Transactions per Active User. Target ≥ 12.

### Riskiest assumption
> A user will still be logging transactions on day 14.

D14 retention ≥ 25% is the make-or-break metric. Retention risk = HIGH;
engineering difficulty = LOW/MEDIUM. Engineering is not the bottleneck.

### Monetization
Free in v1. Revisit when D14 ≥ 25% sustained for 4 consecutive weeks.

### Key metrics
| Stage | Metric | Target |
| :--- | :--- | :--- |
| Activation | `t_log` p50 | ≤ 3s |
| Activation | First-log within 24h | ≥ 70% |
| Retention | D1 / D7 / D14 / D30 | 60% / 40% / **25%** / 15% |
| Engagement | WLTAU | ≥ 12 |
| Guardrail | Sync failure rate | ≤ 1% |
| Guardrail | Crash-free sessions | ≥ 99.5% |
| Guardrail | Lighthouse mobile | ≥ 90 |

---

## tech-stack.md

| Layer | Technology | Version |
| :--- | :--- | :--- |
| Framework | Next.js (App Router, webpack) | 16.3.0 |
| Runtime | React | 19.2.8 |
| Language | TypeScript (`strict: true`) | 5 |
| Styling | Tailwind CSS v4 (`@theme inline`) | 4 |
| Backend | Supabase (Postgres + Auth + RLS) | ssr 0.12.4 / js 2.112.2 |
| State | Zustand | 5.0.14 |
| Validation | Zod | 4.4.3 |
| Icons | lucide-react | 1.30.0 |
| PWA | @ducanh2912/next-pwa | 10.2.9 |
| AI | Google Gemini (receipt OCR) | via `@google/generative-ai` (to add) |

### Conventions
- `any` is forbidden (NR-MAIN-1)
- All Server Action inputs validated with Zod before DB access (NR-SEC-2)
- No raw SQL interpolation — Supabase ORM or parameterized RPC only (NR-SEC-3)
- Wallet balance mutations must be atomic (NR-REL-3)
- All numeric display uses `font-mono tabular-nums`
- DB types generated from Supabase schema (NR-MAIN-2)

### Runtime note
Lives at `C:\xampp\htdocs\KasDesk` but **cannot** be served by Apache/XAMPP —
this is a Node.js app. Use `npm run dev` or `npm run build && npm start`.

---

## workflow.md

### Context reading order (mandatory for AI agents)
1. `PRD.md`
2. `ARCHITECTURE.md`
3. `DATABASE-SPEC.md` + `DESIGN-SYSTEM.md`
4. Then write code.

### Definition of Done
- [ ] TypeScript `tsc --noEmit` clean
- [ ] ESLint clean
- [ ] `next build` succeeds
- [ ] Unit tests pass (Vitest)
- [ ] E2E passes for touched critical path (Playwright)
- [ ] Zod schema updated if payload changed
- [ ] ADR written for any architectural decision
- [ ] Design tokens used — no arbitrary colors/radii
- [ ] `font-mono tabular-nums` on all numbers
- [ ] WCAG 2.2 AA checked for new interactive elements
- [ ] No financial data in logs/analytics
- [ ] Context docs updated in the same commit

### Commit policy
Context changes are committed alongside code changes.

---

## tracks.md

### Release tracks
| Track | Theme | Contents | Gate |
| :--- | :--- | :--- | :--- |
| R0 | Foundation | Tokens, routing skeleton, Supabase wiring, auth, rename to KASDESK | Build + typecheck green |
| R1 | **The Loop** | Quick log, wallet CRUD, txn list, safe daily spend, fix 404 routes | p50 `t_log` ≤ 3s |
| R2 | Money Map | Vaults, debts, split-bill, WhatsApp share | 20 users complete journeys |
| R3 | Intelligence | Insights, 7-day flow, leakage alerts | G2 metric met |
| R4 | Magic | Gemini OCR scan → auto-fill | OCR accuracy ≥ 90% |
| R5 | Polish | PWA install, offline, a11y audit, perf | Lighthouse ≥ 90, WCAG 2.2 AA |

### Backlog of known defects (from PRD §11)
Each is a work item that must be closed before its release gate.

| ID | Defect | Track |
| :-- | :--- | :--- |
| 11.1 | Rename Vaultify → KASDESK | R0 |
| 11.2 | Missing `middleware.ts` (sessions won't persist) | R0 |
| 11.3 | `amount` lacks `.positive()` | R1 |
| 11.4 | Wallet balance never updates (no trigger) | R1 |
| 11.5 | Gemini SDK + `/api/scan-receipt` missing | R4 |
| 11.6 | Dead `pb-safe` class | R1 |
| 11.7 | `userScalable: false` blocks zoom | R1 |
| 11.8 | PWA icons 404 | R5 |
| 11.9 | 3 of 5 nav routes are 404 | R1 |
| 11.10 | FAB has no `onClick` | R1 |
| 11.11 | Conflicting OCR JSON shapes | R4 |
| 11.12 | Data layer unused (no importers) | R1 |
| 11.13–11.15 | Doc conflicts (schema, Next version, dir) | R0 |
| 11.16 | Home data hardcoded | R1 |
| 11.17 | Work uncommitted (1 commit only) | R0 |

---

## Open questions (from PRD §14)
Q1 billing cycle · Q2 default category set · Q3 realtime vs refetch · Q4 WhatsApp share
mechanism · Q5 vault segregation · Q6 analytics tooling · Q7 Gemini model tier ·
Q8 offline queue storage.
