# KASDESK — Architecture Specification & Decision Records

**Status:** Draft v1.0
**Last Updated:** 2026-09-09
**Authoritative for:** system structure, routing, ADRs, Server Action contracts, performance
**Derived from:** `PRD.md`
**Supersedes:** `REACTIVITY.md`, `MEMORY.md` (architecture sections)

---

## 1. System Context

### 1.1 C4 Level 1 — System Context

```
                        ┌───────────────────────┐
                        │   Indonesian User      │
                        │  (Andi / Sinta / Budi) │
                        │  mid-range Android     │
                        └───────────┬───────────┘
                                    │ HTTPS
                                    │ (PWA, installed or browser)
                    ┌───────────────▼────────────────┐
                    │          KASDESK PWA            │
                    │   Next.js 16.3 App Router       │
                    │   mobile-first 390×844          │
                    └───┬───────────┬──────────┬─────┘
                        │           │          │
           ┌────────────▼──┐  ┌─────▼──────┐  ┌▼──────────────┐
           │   Supabase     │  │  Google    │  │   WhatsApp    │
           │ Postgres+Auth  │  │  Gemini    │  │ (share target)│
           │ RLS + RPC      │  │  (OCR v1)  │  │               │
           └────────────────┘  └────────────┘  └───────────────┘
```

### 1.2 C4 Level 2 — Container Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser/PWA)                     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Server       │  │ Client       │  │ Service Worker       │  │
│  │ Components   │  │ Components   │  │ (next-pwa/workbox)   │  │
│  │ (RSC, data)  │  │ (interactive)│  │ offline shell + cache│  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────┘  │
│         │                 │                       │             │
│  ┌──────▼─────────────────▼───────────────────────▼──────────┐  │
│  │              Zustand Store (optimistic state)              │  │
│  │  transactions[] · pendingQueue[] · uiState                 │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼────────────────────────────────┐  │
│  │              IndexedDB (offline queue, durable)            │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Server Actions (RPC over HTTP)
                                │ Route Handlers (/api/*)
┌───────────────────────────────▼─────────────────────────────────┐
│                     NEXT.JS SERVER (Node)                        │
│                                                                  │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────────────┐ │
│  │ middleware.ts│  │ Server Actions│  │ Route Handlers        │ │
│  │ (auth refresh)│ │ (mutations)   │  │ /api/scan-receipt     │ │
│  └──────┬───────┘  └───────┬───────┘  └───────────┬───────────┘ │
│         │                  │                       │             │
│  ┌──────▼──────────────────▼───────────────────────▼──────────┐ │
│  │            Zod Validation Layer (all inputs)                │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                          SUPABASE                                │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Postgres   │  │ Auth (JWT)   │  │ RLS + SECURITY DEFINER   │ │
│  │ tables+idx │  │ email+Google │  │ RPC (atomic balance)     │ │
│  └────────────┘  └──────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Google Gemini    │
                    │  (receipt OCR)     │
                    └────────────────────┘
```

### 1.3 Trust Boundaries

| Boundary | Crosses | Control |
| :--- | :--- | :--- |
| B1: Device ↔ Internet | All traffic | HTTPS only, secure cookies |
| B2: Client ↔ Next server | Server Action args | Zod validation, auth check |
| B3: Next server ↔ Supabase | DB queries | RLS + RPC ownership guards |
| B4: Next server ↔ Gemini | Image upload | API key server-side only, no persistence |

---

## 2. Routing Structure

### 2.1 File Tree (target)

```
app/
├── layout.tsx                     # root: fonts, PWA meta, viewport
├── globals.css                    # @theme tokens + @utility pb-safe
├── page.tsx                       # Home / Dashboard        (protected)
├── login/page.tsx                 # Auth                    (public)
├── auth/
│   ├── callback/route.ts          # OAuth code exchange
│   └── signout/route.ts
├── wallets/page.tsx               # Dompet                  (protected)
├── vaults/page.tsx                # Target                  (protected)
├── debts/page.tsx                 # Utang/Piutang           (protected)
├── insights/page.tsx              # Wawasan                 (protected)
├── settings/page.tsx              # Account, export, delete (protected)
└── api/
    └── scan-receipt/route.ts      # Gemini OCR proxy

components/
├── ui/                            # primitives
│   ├── GroupedTable.tsx
│   ├── TabularNumber.tsx
│   ├── CategoryChipRow.tsx
│   ├── StatusTag.tsx
│   ├── BottomSheet.tsx
│   ├── EmptyState.tsx
│   └── Toast.tsx
├── dashboard/
│   ├── SafeSpendMeter.tsx
│   ├── TransactionRow.tsx
│   ├── TransactionFeed.tsx
│   └── BarChart7Day.tsx
├── modals/
│   ├── QuickLogSheet.tsx          # THE critical path
│   ├── TransferSheet.tsx
│   └── ScanSheet.tsx
├── vaults/VaultCard.tsx
├── debts/DebtRow.tsx  SplitBillSheet.tsx
└── shared/
    ├── BottomNav.tsx
    └── AppHeader.tsx

lib/
├── actions/
│   ├── transactions.ts            # create/update/delete via RPC
│   ├── wallets.ts
│   ├── vaults.ts
│   └── debts.ts
├── schemas.ts                     # Zod (per DATABASE-SPEC §5.2)
├── store.ts                       # Zustand
├── utils/
│   ├── currency.ts                # formatIDR, parseIDRInput
│   └── date.ts                    # grouping, cycle math
├── offline/queue.ts               # IndexedDB pending writes
└── supabase/
    ├── client.ts
    ├── server.ts
    ├── middleware.ts
    └── database.types.ts          # generated

middleware.ts                      # ← MISSING TODAY (PRD §11.2)
```

### 2.2 Route Guards

| Route | Auth | Notes |
| :--- | :--- | :--- |
| `/login` | public | redirect to `/` if already authed |
| `/` `/wallets` `/vaults` `/debts` `/insights` `/settings` | **required** | PRD FR-AUTH-9 |
| `/api/scan-receipt` | **required** | rate-limited per user |
| `/auth/callback` | public | OAuth exchange |

---

## 3. Server Action Contract

### 3.1 The Discriminated Union

Every Server Action returns `ActionResponse<T>` (already defined in `lib/schemas.ts`):

```ts
export type ActionResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string }
```

This is mandated by PRD NR-MAIN-1 (no `any`) and the `error-handling-patterns` skill's
Result-type guidance. **Never throw a raw `Error` to the client.**

### 3.2 Canonical Pattern

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { CreateTransactionSchema, type ActionResponse, type Transaction } from '@/lib/schemas'
import { revalidatePath } from 'next/cache'

export async function createTransaction(
  input: unknown
): Promise<ActionResponse<Transaction>> {
  try {
    // 1 ── Validate with Zod (NEVER skip; PRD NR-SEC-2)
    const parsed = CreateTransactionSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        data: null,
        error: parsed.error.issues.map((i) => i.message).join(', '),
      }
    }

    // 2 ── Server client (cookie-aware)
    const supabase = await createClient()

    // 3 ── Auth check: never trust the client's user_id
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, data: null, error: 'Unauthorized. Silakan login.' }
    }

    // 4 ── Atomic mutation via RPC (PRD NR-REL-3, fixes §11.4)
    const { data, error } = await supabase.rpc('create_transaction', {
      p_wallet_id:    parsed.data.wallet_id,
      p_amount:       parsed.data.amount,
      p_type:         parsed.data.type,
      p_title:        parsed.data.title,
      p_category_tag: parsed.data.category_tag,
      p_note:         parsed.data.note ?? null,
      p_occurred_at:  parsed.data.occurred_at ?? new Date().toISOString(),
      p_to_wallet_id: parsed.data.to_wallet_id ?? null,
      p_category_id:  parsed.data.category_id ?? null,
    })

    if (error) {
      // Log server-side WITHOUT amounts (PRD NR-SEC-6)
      console.error('[createTransaction] rpc failed', error.code)
      return { success: false, data: null, error: 'Gagal menyimpan transaksi.' }
    }

    // 5 ── Revalidate affected routes
    revalidatePath('/')
    revalidatePath('/wallets')
    revalidatePath('/insights')

    return { success: true, data: data as Transaction, error: null }
  } catch (err) {
    console.error('[createTransaction] unexpected', err instanceof Error ? err.name : 'unknown')
    return { success: false, data: null, error: 'Terjadi kesalahan tak terduga.' }
  }
}
```

**Non-negotiables:**
- Validate **before** touching the DB.
- Derive `user_id` from the session, **never** from input.
- Log `error.code`, never the payload (PRD NR-SEC-6: no financial data in logs).
- Return user-facing Indonesian messages.

---

## 4. The 3-Second Logging Path (Critical Flow)

This is the most important sequence in the system. Optimistic-first, per PRD FR-LOG-6.

```
 USER              CLIENT                    SERVER                 SUPABASE
  │                  │                         │                       │
  │ tap FAB          │                         │                       │
  ├─────────────────►│                         │                       │
  │                  │ open sheet              │                       │
  │                  │ autofocus amount        │                       │
  │◄─────────────────┤ (<50ms)                 │                       │
  │                  │                         │                       │
  │ type 12000       │                         │                       │
  ├─────────────────►│                         │                       │
  │ tap [KOPI]       │                         │                       │
  ├─────────────────►│                         │                       │
  │ tap SIMPAN       │                         │                       │
  ├─────────────────►│                         │                       │
  │                  │ ① optimistic row        │                       │
  │◄─────────────────┤   (<50ms) ── CLOSE ──   │                       │
  │  row visible     │                         │                       │
  │                  │ ② createTransaction()   │                       │
  │                  ├────────────────────────►│                       │
  │                  │                         │ ③ Zod + auth          │
  │                  │                         │ ④ rpc create_txn      │
  │                  │                         ├──────────────────────►│
  │                  │                         │                       │ insert + balance
  │                  │                         │◄──────────────────────┤ (ATOMIC)
  │                  │◄────────────────────────┤                       │
  │                  │ ⑤ success: reconcile id │                       │
  │                  │                         │                       │
  │  (on failure)    │                         │                       │
  │                  │ ⑥ rollback + toast      │                       │
  │◄─────────────────┤                         │                       │
```

**Timing budget (PRD NR-PERF-1/2):**

| Step | Budget |
| :--- | :--- |
| FAB tap → sheet interactive | ≤ 100ms |
| Typing + chip select (user) | ~2s |
| SIMPAN → optimistic row visible | **≤ 50ms** |
| Sheet close | ≤ 150ms |
| Background RPC | ≤ 400ms p95 (NR-PERF-8) |
| **Total perceived (`t_log`)** | **≤ 3s p50** |

### 4.1 Optimistic Implementation

```tsx
'use client'
import { useOptimistic } from 'react'

export function TransactionFeed({ initial }: { initial: Transaction[] }) {
  const [optimistic, addOptimistic] = useOptimistic(
    initial,
    (state, pending: Transaction) => [pending, ...state]
  )

  async function submit(input: CreateTransactionInput) {
    const temp: Transaction = {
      ...input,
      id: `temp-${crypto.randomUUID()}`,
      user_id: '',
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category_id: null,
      note: input.note ?? null,
      to_wallet_id: input.to_wallet_id ?? null,
      _pending: true,
    } as Transaction

    addOptimistic(temp)                 // ← instant, <50ms
    const res = await createTransaction(input)
    if (!res.success) {
      // rollback is automatic: useOptimistic reverts when the action settles
      toast.error(res.error)
    }
  }
  // ...
}
```

`useOptimistic` reverts automatically when the transition completes, so **rollback is
structural, not manual** — this is why it is preferred over manual Zustand bookkeeping for
this path (see ADR-0003).

---

## 5. Offline & Sync

```
┌──────────────┐   enqueue    ┌──────────────────┐   flush   ┌──────────┐
│ QuickLog     ├─────────────►│ IndexedDB queue  ├──────────►│ Server   │
│ (offline OK) │              │ (durable)        │◄──────────┤ Action   │
└──────────────┘              └──────────────────┘  on:online└──────────┘
                                       │
                                       │ retry w/ backoff
                                       ▼
                                  max 5 attempts → surface error
```

- Queue is **durable** (survives reload) — PRD FR-OFF-6.
- Flush on `online` event + on app foreground.
- Each queued item has a client-generated idempotency key to prevent double-apply.
- Conflict policy: last-write-wins using `updated_at` (PRD FR-OFF-5).

---

## 6. Caching & Revalidation

| Data | Strategy | Revalidate |
| :--- | :--- | :--- |
| Home feed | Server Component fetch | `revalidatePath('/')` after mutation |
| Wallet list | Server Component | `revalidatePath('/wallets')` |
| Categories | Rarely changes | `revalidatePath` on create/edit only |
| Static shell | PWA precache | service worker |
| Receipt scan | `POST`, never cached | — |

**Rule:** mutate via Server Action → `revalidatePath` the affected routes → RSC payload
refetches. No client-side SWR/tanstack-query is needed for v1 (ADR-0003).

---

## 7. Performance Rules (from `vercel-react-best-practices`)

Mandatory in code review:

| # | Rule |
| :-- | :--- |
| P1 | Server Components by default; `'use client'` only when interactivity is needed |
| P2 | Keep `'use client'` at the **leaves** — never wrap a whole page |
| P3 | Fetch in parallel, never sequentially in a waterfall |
| P4 | `dynamic import()` for heavy/modal components (QuickLogSheet, ScanSheet) |
| P5 | No barrel-file imports from icon libraries (`import { Home } from 'lucide-react'` is OK; avoid re-export barrels) |
| P6 | Memoize expensive derived values with `useMemo` |
| P7 | Stable function references (`useCallback`) for list item handlers |
| P8 | Virtualize or paginate long transaction lists (50/page per FR-TXN-6) |
| P9 | Use `next/font` (already done: Inter + JetBrains Mono) |
| P10 | Defer third-party scripts; no blocking analytics on the log path |
| P11 | Prefer CSS transforms/opacity for animation |
| P12 | No layout thrashing — batch DOM reads/writes |
| P13 | Hoist static JSX out of render |
| P14 | Avoid `useEffect` for derived state (derive during render) |
| P15 | `React.memo` on `TransactionRow` (rendered 50× in a list) |

---

## 8. Component Composition (from `vercel-composition-patterns`)

**Avoid boolean prop proliferation.** Instead of:

```tsx
// ❌ bad
<Button primary large rounded_icon loading disabled />
```

Use composition + variants:

```tsx
// ✅ good — compound / slot-based
<GroupedTable>
  <GroupedTable.Row>
    <GroupedTable.Tag>MAKAN</GroupedTable.Tag>
    <GroupedTable.Content title="Nasi Goreng" subtitle="BCA • 12:30" />
    <GroupedTable.Amount value={-35000} type="expense" />
  </GroupedTable.Row>
</GroupedTable>
```

Rules:
- Max 3 boolean props per component; beyond that, split or use variants.
- Children/slots over configuration objects.
- Every primitive accepts `className` for escape hatches.
- No inline component definitions inside render (causes remounts).

---

## 9. OpenAPI 3.1 — `/api/scan-receipt`

```yaml
openapi: 3.1.0
info:
  title: KASDESK API
  version: 1.0.0
  description: Receipt OCR endpoint (Gemini-backed).
servers:
  - url: https://kasdesk.app/api
paths:
  /scan-receipt:
    post:
      operationId: scanReceipt
      summary: Extract structured data from a receipt image
      security:
        - cookieAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [image]
              properties:
                image:
                  type: string
                  format: binary
                  description: JPEG/PNG/WebP, max 5 MB
      responses:
        '200':
          description: Extraction succeeded (always review if confidence < 0.7)
          content:
            application/json:
              schema:
                type: object
                required: [merchant_name, items, detected_total, confidence_score, detected_category]
                properties:
                  merchant_name:   { type: string, default: "Unknown Merchant" }
                  items:
                    type: array
                    items:
                      type: object
                      required: [name, price]
                      properties:
                        name:     { type: string }
                        price:    { type: number, minimum: 0 }
                        quantity: { type: number, minimum: 1, default: 1 }
                  detected_total:    { type: number, minimum: 0 }
                  confidence_score:  { type: number, minimum: 0, maximum: 1 }
                  detected_category: { type: string, pattern: '^[A-Z0-9_]{1,20}$' }
        '400':
          description: Invalid or oversized image
        '401':
          description: Unauthenticated
        '429':
          description: Rate limit exceeded
        '503':
          description: OCR provider unavailable — fall back to manual entry
components:
  securitySchemes:
    cookieAuth:
      type: apiKey
      in: cookie
      name: sb-access-token
```

> **Note:** the image is **never persisted** (PRD FR-OCR-7 / NG8). This endpoint is
> stateless.

---

# 10. Architecture Decision Records

> Format: MADR, per the `architecture-decision-records` skill.
> Lifecycle: `Proposed → Accepted → Deprecated → Superseded` (or `Rejected`).

---

## ADR-0001: Use Next.js App Router (not Pages Router, not SPA)

**Status:** Accepted

### Context
KASDESK is a mobile-first PWA with a small number of screens, heavy data mutation, and a
hard performance requirement (`t_log` ≤ 3s). The repo already uses Next.js 16.3 App Router.
Alternatives: Pages Router, or a pure SPA (Vite + React Router).

### Decision Drivers
- **Must support** Server Components to cut client JS (NR-PERF-6: ≤ 250 KB)
- **Must support** Server Actions for mutations without hand-writing API routes
- **Should** support PWA via `next-pwa`
- **Should** keep the bundle small for mid-range Android

### Considered Options
**Option 1: Next.js App Router**
- Pros: RSC reduces client JS; Server Actions remove boilerplate; built-in revalidation;
  `next/font`; already in place; PWA plugin available.
- Cons: Learning curve; caching semantics changed across versions; some third-party
  libraries assume client-only.

**Option 2: Pages Router**
- Pros: Mature, predictable.
- Cons: No RSC; larger bundles; `getServerSideProps` is coarser than RSC streaming;
  deprecated direction.

**Option 3: Vite SPA**
- Pros: Simplest mental model; fastest HMR.
- Cons: No SSR/SEO; we would hand-roll an API layer; no Server Actions; worse first load
  on slow 4G — directly harms LCP (NR-PERF-3).

### Decision
**Next.js 16.3 App Router.**

### Rationale
1. RSC directly serves NR-PERF-6 (bundle size) and NR-PERF-3 (LCP).
2. Server Actions + `revalidatePath` give correct cache invalidation for free.
3. Already the incumbent — switching costs buy nothing.

### Consequences
**Positive:** Less client JS; simpler mutation story; streaming with Suspense.
**Negative:** Team must respect RSC/client boundary rules; some libs need `'use client'`.
**Risks:** Caching semantics differ across Next versions.
- *Mitigation:* pin Next version; read `node_modules/next/dist/docs/` before upgrades
  (per `AGENTS.md` Next.js agent rules).

### Related
- ADR-0002 (Supabase), ADR-0004 (Server Actions), ADR-0012 (middleware auth)

---

## ADR-0002: Use Supabase as Backend (Postgres + Auth + RLS)

**Status:** Accepted

### Context
We need auth, a relational store with strict per-user isolation, and atomic multi-table
mutations. Already wired via `@supabase/ssr`.

### Decision Drivers
- **Must** provide row-level per-user isolation (NR-SEC-1)
- **Must** support atomic transactions + balance updates (NR-REL-3)
- **Should** include auth (email + Google OAuth) (FR-AUTH-1/2)
- **Should** be cheap at low scale (monetization deferred — PRD §10)

### Considered Options
**Option 1: Supabase**
- Pros: Postgres + Auth + RLS in one; generous free tier; generated TS types; RPC for
  atomic ops; already integrated.
- Cons: Vendor coupling; RLS performance footguns; product changes frequently.

**Option 2: Separate Postgres (Neon/Railway) + Auth.js**
- Pros: No vendor lock-in; full control.
- Cons: Two systems to operate; must hand-build RLS-like isolation in app code (error-prone);
  more infra cost.

**Option 3: Firebase / Firestore**
- Pros: Realtime, easy auth.
- Cons: NoSQL makes the relational wallet/transaction model awkward; weaker constraints;
  harder to guarantee atomic balance updates.

### Decision
**Supabase (Postgres + Auth + RLS + RPC).**

### Rationale
1. RLS gives per-user isolation enforced by the database, not by app code —
   directly satisfies NR-SEC-1 with less risk of an authorization bug.
2. The four-pillar relational model is a natural fit for Postgres.
3. `SECURITY DEFINER` RPC gives true atomicity (fixes PRD §11.4).

### Consequences
**Positive:** Fast to build; strong isolation; typed client.
**Negative:** Vendor coupling; must monitor changelog for breaking changes.
**Risks:** RLS misconfiguration exposes data.
- *Mitigation:* `WITH CHECK` on every policy (ADR-0013); automated RLS tests
  (DATABASE-SPEC §12); `supabase db advisors` in CI.

### Related
- ADR-0008 (RPC), ADR-0013 (RLS WITH CHECK)

---

## ADR-0003: Zustand for UI/Offline State; `useOptimistic` for the Log Path

**Status:** Accepted

### Context
We need optimistic UI (< 50ms), an offline queue, and cross-screen UI state (which sheet is
open). Two mechanisms are available: `useOptimistic` (React 19) and Zustand. The current
`lib/store.ts` has a Zustand store that **nothing imports** (PRD §11.12).

### Decision Drivers
- **Must** render the optimistic row in < 50ms (NR-PERF-2 / FR-LOG-6)
- **Must** roll back automatically on failure (FR-LOG-11)
- **Must** support a durable offline queue (FR-OFF-6)
- **Should** avoid manual reconciliation bugs

### Considered Options
**Option 1: `useOptimistic` for mutations + Zustand for UI/offline**
- Pros: React reverts optimistic state automatically on settle — rollback is structural;
  Zustand handles what React state shouldn't (offline queue, sheet state, cross-route).
- Cons: Two mechanisms to understand.

**Option 2: Zustand only (manual rollback)**
- Pros: One mechanism; full control; easy to persist.
- Cons: Rollback must be hand-written per action — a known source of bugs; diverges from
  server truth when revalidation lands.

**Option 3: `useOptimistic` only**
- Pros: Minimal.
- Cons: Cannot express a durable offline queue or cross-route UI state.

### Decision
**Both, with clear ownership:**
- `useOptimistic` → the transaction mutation path (instant + auto-rollback).
- Zustand → offline queue, pending-count badge, sheet/modal state, last-used wallet/category.

### Rationale
1. Rollback correctness matters most on the critical path — `useOptimistic` makes it free.
2. The offline queue is inherently non-React state that must survive navigation → Zustand.
3. This resolves PRD §11.12: the existing store gets a real job instead of being deleted.

### Consequences
**Positive:** Correct rollback by construction; clear separation of concerns.
**Negative:** Two state tools; contributors must know which to reach for.
**Risks:** State could diverge if both hold transaction data.
- *Mitigation:* **Zustand never stores the transaction list.** Server is the source of
  truth; Zustand holds only queue + UI state.

### Related
- ADR-0009 (offline queue)

---

## ADR-0004: Server Actions for Mutations; Route Handlers Only for OCR

**Status:** Accepted

### Context
Mutations (create/update/delete transaction, wallet, vault, debt) must be simple and
type-safe. Receipt OCR must proxy to Gemini with an image upload.

### Decision Drivers
- **Must** be type-safe end-to-end (NR-MAIN-1)
- **Must** validate with Zod (NR-SEC-2)
- **Should** minimize boilerplate
- OCR needs `multipart/form-data` + streaming-friendly handling

### Considered Options
**Option 1: Server Actions for all mutations + one Route Handler for OCR**
- Pros: Type-safe, no fetch boilerplate, automatic `revalidatePath`; Route Handler fits
  file upload naturally.
- Cons: Server Actions are POST-only and not cacheable (fine for mutations).

**Option 2: Route Handlers for everything**
- Pros: Explicit REST API; easy to curl/test.
- Cons: Hand-written client fetch layer; manual typing of responses; more code.

**Option 3: tRPC**
- Pros: Excellent DX and typing.
- Cons: Extra dependency and build setup; overlaps with RSC benefits; more moving parts
  for a small app.

### Decision
**Server Actions for domain mutations; `app/api/scan-receipt/route.ts` for OCR.**

### Rationale
1. Server Actions eliminate an entire fetch/typing layer for ~6 mutation endpoints.
2. `revalidatePath` couples mutation to cache invalidation correctly.
3. OCR is a genuine HTTP endpoint (binary upload, external API) — a Route Handler is the
   right shape and keeps the API key server-side.

### Consequences
**Positive:** Less code; type-safe; correct invalidation.
**Negative:** Two patterns coexist.
**Risks:** Someone adds a mutation as a Route Handler.
- *Mitigation:* Document the rule; enforce in code review.

### Related
- ADR-0011 (Gemini proxy), ADR-0005 (Zod)

---

## ADR-0005: Zod Validation Layer on Every Server Boundary

**Status:** Accepted

### Context
PRD NR-SEC-2 requires all Server Action inputs to be validated before DB access.
`SECURITY.md` already mandates this, but `amount` currently lacks `.positive()` (PRD §11.3).

### Decision Drivers
- **Must** prevent invalid/injected data reaching the DB
- **Must** give the user actionable feedback
- **Should** be the single source of truth for types (DB + UI)

### Considered Options
**Option 1: Zod at every boundary + DB CHECK constraints**
- Pros: Fast feedback, type inference, defense in depth with Postgres CHECKs.
- Cons: Schema duplicated in TS and SQL (mitigated by generation + review).

**Option 2: DB constraints only**
- Pros: Single source of truth.
- Cons: Poor UX (raw constraint errors); no client-side pre-validation.

**Option 3: Manual validation**
- Pros: None meaningful.
- Cons: Error-prone; violates `SECURITY.md`.

### Decision
**Zod at every server boundary, mirrored by DB constraints.**

### Rationale
1. Zod gives typed inference that keeps TS and runtime in sync.
2. DB CHECKs are the last line of defense even if a code path forgets Zod.
3. `SECURITY.md` already requires it — this ADR makes it enforceable in review.

### Consequences
**Positive:** Strong input safety; better errors.
**Negative:** Two places to update when a field changes.
**Risks:** Drift between Zod and SQL.
- *Mitigation:* DATABASE-SPEC §5 is generated to match; CI test asserts the two agree on
  enum values and amount positivity.

### Related
- ADR-0002, PRD §11.3

---

## ADR-0006: PWA, Not Native Apps

**Status:** Accepted

### Context
Target users are install-averse and are reached primarily through WhatsApp links.

### Decision Drivers
- **Should** minimize distribution friction (PRD §1.5)
- **Must** work offline (FR-OFF-1)
- **Must** keep one codebase for a solo/small team

### Considered Options
**Option 1: PWA (`@ducanh2912/next-pwa`)**
- Pros: Install from a link; one codebase; instant updates; already configured.
- Cons: Weaker iOS push/background; no store discovery.

**Option 2: React Native / Expo**
- Pros: Native feel; store presence; push notifications.
- Cons: Second codebase; store review friction; slower iteration; higher cost.

**Option 3: Both**
- Pros: Coverage.
- Cons: Doubles the work — unacceptable before retention is proven (PRD §2.5).

### Decision
**PWA only for v1.**

### Rationale
1. WhatsApp link sharing is the dominant Indonesian distribution channel (PRD §4.3).
2. Offline logging is achievable with a service worker + IndexedDB.
3. Retention is unproven — do not double the codebase yet.

### Consequences
**Positive:** Fast shipping; link-based growth.
**Negative:** No push notifications; no app-store presence.
**Risks:** iOS PWA limitations (no background sync).
- *Mitigation:* Flush queue on foreground/online rather than relying on Background Sync.

### Related
- ADR-0009, PRD §10

---

## ADR-0007: Tailwind v4 `@theme` Tokens (No `tailwind.config.js` Theme Block)

**Status:** Accepted

### Context
Tailwind v4 is installed. Design tokens currently live in `app/globals.css` under
`@theme inline`. `DESIGN.md` specifies the Obsidian palette.

### Decision Drivers
- **Must** keep design tokens as the only source of color/type (NR-MAIN-5, `AGENT.md`)
- **Should** avoid arbitrary values in components
- **Should** work with CSS custom properties for runtime theming if ever needed

### Considered Options
**Option 1: Tailwind v4 `@theme inline` in `globals.css`**
- Pros: Native v4 approach; tokens become real utilities; no config file to sync;
  already implemented.
- Cons: Newer syntax; some plugins lag.

**Option 2: `tailwind.config.js` theme extension**
- Pros: Familiar to most devs.
- Cons: v3-era; v4 discourages it; another file to keep in sync.

**Option 3: Plain CSS variables only**
- Pros: Simple.
- Cons: Loses Tailwind utility generation; more custom CSS.

### Decision
**Tailwind v4 `@theme inline` in `app/globals.css`.**

### Rationale
1. Already in place and working (verified: build emits the tokens).
2. Generates utilities (`bg-surface`, `text-accent-income`) so components never hardcode hex.
3. One file to change when the palette evolves.

### Consequences
**Positive:** Single source of truth; no arbitrary values.
**Negative:** Custom utilities need `@utility` (e.g. `pb-safe` — see PRD §11.6).
**Risks:** Someone hardcodes a hex value.
- *Mitigation:* ESLint rule / review checklist item (NR-MAIN-5).

### Related
- PRD §11.6 (`pb-safe`), DESIGN-SYSTEM.md

---

## ADR-0008: Atomic Balance Updates via `SECURITY DEFINER` RPC

**Status:** Accepted
**Fixes:** PRD §11.4 (wallet balance never updates)

### Context
`lib/actions.ts` assumes a DB trigger updates wallet balances, but **no trigger exists**.
Transactions insert; balances stay frozen. `SECURITY.md` §1 requires atomic RPC for
multi-table operations.

### Decision Drivers
- **Must** never let balance and transactions diverge (NR-REL-2)
- **Must** handle transfers (two wallets) atomically
- **Must** handle update/delete reversal
- **Should** be race-safe under concurrent writes

### Considered Options
**Option 1: `SECURITY DEFINER` RPC (chosen)**
- Pros: True atomicity; single call from the client; handles transfer/update/delete
  symmetrically; ownership enforced inside.
- Cons: Bypasses RLS, so guards must be explicit and correct.

**Option 2: `AFTER INSERT/UPDATE/DELETE` triggers**
- Pros: Automatic; no client change.
- Cons: Recursion risk on balance updates; transfer logic gets convoluted; harder to test;
  error messages are opaque.

**Option 3: Client-side two-step (insert, then update balance)**
- Pros: Simple to read.
- Cons: **Not atomic** — a failure between steps corrupts data. Rejected outright.

### Decision
**All balance-affecting mutations go through `SECURITY DEFINER` RPCs**
(`create_transaction`, `update_transaction`, `delete_transaction`).

### Rationale
1. Only RPC guarantees the balance and the ledger cannot diverge.
2. Transfer, edit, and delete reversal are all expressible in one place.
3. Satisfies `SECURITY.md` §1 and NR-REL-3.

### Consequences
**Positive:** Data integrity by construction; simpler client.
**Negative:** RPC bypasses RLS → guards are mandatory, not optional.
**Risks:** A missing ownership check in a new RPC = cross-user write.
- *Mitigation:* Every RPC starts with `auth.uid()` + ownership assertions; automated test
  attempts a cross-user write and expects failure (DATABASE-SPEC §12).

### Related
- ADR-0002, ADR-0013

---

## ADR-0009: Offline Queue — IndexedDB + Zustand, Flush on Reconnect

**Status:** Accepted

### Context
PRD FR-OFF-2/3/6 require logging offline with durable queuing and auto-sync. iOS PWA has no
reliable Background Sync.

### Decision Drivers
- **Must** survive reload/close (durable)
- **Must** not lose a logged transaction (NR-REL-1)
- **Must** be idempotent on retry (no double-apply)

### Considered Options
**Option 1: IndexedDB queue + Zustand mirror, flush on `online`/foreground**
- Pros: Durable; works on iOS; simple; no dependency.
- Cons: Hand-rolled retry logic.

**Option 2: Workbox Background Sync**
- Pros: Purpose-built.
- Cons: Not supported on iOS Safari — our largest platform.

**Option 3: `localStorage`**
- Pros: Trivial.
- Cons: Size limits; synchronous; not durable enough for a financial queue.

### Decision
**IndexedDB (via a thin `lib/offline/queue.ts`), mirrored in Zustand for UI, flushed on
`online` + foreground with exponential backoff (max 5 attempts).**

### Rationale
1. iOS support is non-negotiable → rules out Background Sync.
2. Idempotency keys prevent double-apply on retry.
3. Mirroring in Zustand lets the UI show a "pending" badge without async reads.

### Consequences
**Positive:** Durable; iOS-safe; no dependency.
**Negative:** More code than Background Sync.
**Risks:** Stuck queue after 5 failures.
- *Mitigation:* Surface a visible error with a manual retry; never silently drop.

### Related
- ADR-0003, ADR-0006

---

## ADR-0010: Optimistic UI with Automatic Rollback

**Status:** Accepted

### Context
PRD FR-LOG-6 requires the row to appear in < 50ms; FR-LOG-11 requires rollback on failure.

### Decision Drivers
- **Must** feel instant
- **Must** not show false data after a failure

### Considered Options
**Option 1: `useOptimistic` (chosen)** — React reverts automatically when the action settles.
**Option 2: Manual Zustand insert + explicit rollback** — more control, more bugs.
**Option 3: Pessimistic (wait for server)** — violates NR-PERF-2.

### Decision
**`useOptimistic` on the transaction path.**

### Rationale
Rollback correctness is the main risk of optimistic UI; `useOptimistic` makes it structural
rather than something a developer must remember.

### Consequences
**Positive:** No stale optimistic rows; less code.
**Negative:** Only works inside a transition; must be called within `startTransition`
or a form action.
**Risks:** Developer calls it outside a transition → silent no-op.
- *Mitigation:* Lint/review check; one shared `TransactionFeed` implementation.

### Related
- ADR-0003

---

## ADR-0011: Gemini OCR Proxied Server-Side (Never Client-Side)

**Status:** Accepted

### Context
PRD FR-OCR-2 requires server-side calling; the Gemini API key must never reach the browser.
Currently neither the SDK nor the route exists (PRD §11.5).

### Decision Drivers
- **Must** keep the API key secret
- **Must** enforce per-user rate limits (FR-OCR-9)
- **Must** not persist receipt images (FR-OCR-7)

### Considered Options
**Option 1: Route Handler proxy (chosen)** — key server-side, rate-limit by `auth.uid()`.
**Option 2: Supabase Edge Function** — also fine, but adds a deploy target and cold starts.
**Option 3: Client-side Gemini call** — exposes the key. **Rejected.**

### Decision
**`app/api/scan-receipt/route.ts` proxying to Gemini; image held in memory only.**

### Rationale
1. Key secrecy is non-negotiable.
2. Rate limiting needs a trusted server context.
3. Route Handler keeps everything in one deployable.

### Consequences
**Positive:** Key safe; rate limiting possible.
**Negative:** Adds a network hop; serverless memory limits on large images.
**Risks:** Cost blowup from abuse.
- *Mitigation:* 5 MB cap, per-user rate limit, request timeout, cost alerting.

### Related
- ADR-0004, AI-OCR-SPEC.md

---

## ADR-0012: Auth Session Refresh via `middleware.ts`

**Status:** Accepted
**Fixes:** PRD §11.2 (sessions won't persist)

### Context
`lib/supabase/server.ts` swallows cookie-set errors with a comment assuming middleware
exists. **No `middleware.ts` exists**, so refresh tokens are never rotated and sessions die.

### Decision Drivers
- **Must** keep users signed in (FR-AUTH-3)
- **Must** protect routes (FR-AUTH-9)
- **Should** be the standard Supabase SSR pattern

### Considered Options
**Option 1: `middleware.ts` with `updateSession` (chosen)**
- Pros: Official Supabase pattern; refreshes on every request; enables route guards.
- Cons: Runs on every request (small cost).

**Option 2: Client-only refresh**
- Pros: No middleware.
- Cons: RSC cannot set cookies → server components see stale/absent sessions.

**Option 3: Refresh inside each Server Action**
- Pros: No middleware.
- Cons: Repetitive; easy to forget; doesn't protect GET navigation.

### Decision
**Add `middleware.ts` implementing Supabase's `updateSession`, protecting all routes except
`/login` and `/auth/*`.**

### Rationale
Only middleware can reliably rotate the refresh cookie for both navigations and RSC
requests. This is the documented Supabase SSR requirement.

### Consequences
**Positive:** Sessions persist; route guarding is centralized.
**Negative:** One more file; matcher must exclude static assets.
**Risks:** Over-broad matcher breaks asset caching.
- *Mitigation:* Standard matcher excluding `_next/static`, `_next/image`, `favicon.ico`.

### Related
- ADR-0001, SECURITY-SPEC.md

---

## ADR-0013: RLS with `USING` **and** `WITH CHECK`

**Status:** Accepted
**Resolves:** PRD §12.12

### Context
Existing policies use `USING` only. That filters reads but does **not** stop a user from
inserting a row with another user's `user_id`.

### Decision Drivers
- **Must** prevent cross-user reads *and* writes (NR-SEC-1)
- **Should** be enforced by the database, not app code

### Considered Options
**Option 1: `USING` + `WITH CHECK` on every policy (chosen)**
**Option 2: `USING` only** — leaves a write hole. **Rejected.**
**Option 3: App-level checks only** — one forgotten check = breach. **Rejected.**

### Decision
**Every policy includes `WITH CHECK`** (select-only policies excepted).

### Rationale
`WITH CHECK` is the only thing preventing row-ownership forgery on insert/update. Database
enforcement cannot be forgotten by a new code path.

### Consequences
**Positive:** Write-path isolation guaranteed.
**Negative:** Slightly more verbose policies.
**Risks:** None material.
- *Mitigation:* Automated cross-user insert test (DATABASE-SPEC §12).

### Related
- ADR-0002, ADR-0008

---

## ADR-0014: Dark-Only Theme (No Light Mode, No Toggle)

**Status:** Accepted

### Context
The Obsidian Geist aesthetic is defined dark-only. A light theme would require a second
token set, contrast pass, and test matrix.

### Decision Drivers
- **Must** ship fast with limited design resource
- **Should** preserve the intended aesthetic
- **Should** avoid doubling QA surface

### Considered Options
**Option 1: Dark-only (chosen)**
**Option 2: Dark + light with toggle** — doubles tokens, contrast work, and testing.
**Option 3: Follow `prefers-color-scheme`** — implies a light theme exists.

### Decision
**Dark-only. No toggle, no light theme in v1.**

### Rationale
The brand identity *is* the dark obsidian surface. A second theme adds QA cost with no
v1 user demand signal.

### Consequences
**Positive:** Half the design/QA work; consistent brand.
**Negative:** Some users prefer light mode; outdoor readability can suffer.
**Risks:** Accessibility complaints.
- *Mitigation:* Guarantee WCAG AA contrast on the dark palette (DESIGN-SYSTEM §4);
  revisit if user feedback demands it.

### Related
- DESIGN-SYSTEM.md

---

## ADR-0015: No Monetization Infrastructure in v1

**Status:** Accepted

### Context
PRD §10: free in v1; revisit when D14 ≥ 25% for 4 weeks. Billing code built too early is
pure waste if the product pivots.

### Decision Drivers
- **Must not** spend effort on unvalidated revenue paths (PRD §2.5)
- **Should** keep a clean seam for later

### Considered Options
**Option 1: Build nothing; keep a seam (chosen)**
**Option 2: Build paywall scaffolding now** — premature; likely thrown away.
**Option 3: Launch paid** — suppresses the retention signal we need most.

### Decision
**No billing, entitlement, or paywall code in v1.** Instrument cost per active user only.

### Rationale
The riskiest assumption is habit formation (PRD §2.3). Charging pre-validation would
destroy the very signal we need, and billing code would be rework.

### Consequences
**Positive:** Full focus on retention; less code to secure (no payment data).
**Negative:** No revenue; switching costs later if we add tiers.
**Risks:** Cost overrun if usage spikes with no revenue.
- *Mitigation:* Track cost/user from day one; alert thresholds.

### Related
- PRD §10

---

## 11. ADR → Defect Map

| ADR | Defect addressed (PRD §11) |
| :--- | :--- |
| ADR-0002 | 11.13 (schema conflict), 11.12 (unused data layer) |
| ADR-0003 | 11.12 (Zustand unused) |
| ADR-0005 | 11.3 (`amount` lacks `.positive()`) |
| ADR-0007 | 11.6 (dead `pb-safe`) — via `@utility` |
| ADR-0008 | **11.4 (balance never updates)** |
| ADR-0009 | offline requirements FR-OFF-* |
| ADR-0011 | **11.5 (Gemini SDK/route missing)** |
| ADR-0012 | **11.2 (no middleware)** |
| ADR-0013 | 11.13 (RLS `WITH CHECK`) |
| ADR-0014 | 11.7-adjacent (theme scope) |
| ADR-0015 | §10 monetization decision |

---

## 12. Implementation Order

| Phase | Work | ADRs involved |
| :--- | :--- | :--- |
| R0 | Rename to KASDESK, add `middleware.ts`, routing skeleton, env setup | 0001, 0012 |
| R1 | Zod fix, RPC migration, Quick Log + optimistic, wallet CRUD, fix 404s | 0003, 0005, 0008, 0010 |
| R2 | Vaults, debts, split-bill, WhatsApp share | 0004, 0013 |
| R3 | Insights, safe daily spend, 7-day chart | 0002 |
| R4 | Gemini OCR proxy | 0011 |
| R5 | PWA icons, offline queue, a11y pass, perf | 0006, 0007, 0009, 0014 |

---

**End of ARCHITECTURE.md**
