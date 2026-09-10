> # ⚠️ SUPERSEDED — DO NOT USE AS SOURCE OF TRUTH
>
> This document has been **superseded by `PRD.md`** (and its derived specs).
> It is retained only as historical design intent.
>
> **Authoritative documents:**
> - `PRD.md` — what & why (product requirements)
> - `ARCHITECTURE.md` — how (ADRs)
> - `DATABASE-SPEC.md` — schema, RLS, RPC
> - `DESIGN-SYSTEM.md` — visual & interaction
> - `SECURITY-SPEC.md` — threat model & controls
> - `AI-OCR-SPEC.md` — Gemini receipt scanning
> - `QA-STRATEGY.md` — testing, CI/CD, SLOs
> - `conductor/product.md` — machine-readable mirror
>
> Where this file conflicts with `PRD.md`, **`PRD.md` wins**. See `PRD.md` §12
> (Resolved Conflicts) for the specific tie-breaking decisions.
>
> **Product name is now KASDESK** (formerly "Vaultify").
>
> ---

# AGENT.md

## Instructions for AI Coding Assistants (Cursor, Antigravity, Copilot, Windsurf)

### 1. Code Generation Rules
- Always write strict, strongly-typed TypeScript (`.ts`, `.tsx`). Avoid `any`.
- Adhere strictly to the design system in `DESIGN.md`. Do not introduce new colors, gradients, or arbitrary Tailwind classes outside design tokens.
- Use Next.js App Router idioms (`app/` directory, Server Actions for mutations, `useOptimistic` for UI state).
- Group list items into single `bg-[#161619]` containers with `divide-y divide-white/[0.04]`. Do not generate individual floating card components for list rows.
- Ensure all financial values are formatted with tabular numbers using `font-mono tabular-nums`.

### 2. Component Structure Guidelines
```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx          # Overview Screen
│   │   ├── vaults/page.tsx   # Vaults Screen
│   │   ├── debt/page.tsx     # Debt Screen
│   │   └── insights/page.tsx # Insights Screen
│   ├── api/                  # Server-side API endpoints & Gemini OCR
│   ├── globals.css           # Design tokens & CSS variables
│   └── layout.tsx            # Main PWA wrapper & Bottom Navigation
├── components/
│   ├── ui/                   # Buttons, inputs, bottom-sheets
│   ├── dashboard/            # Overview specific modules
│   ├── modals/               # Record, Scan, Transfer, Split-Bill
│   └── shared/               # Navigation, headers, status tags
├── lib/
│   ├── supabase/             # Client & Server DB instances
│   ├── gemini/               # OCR receipt prompt & parser
│   └── utils.ts              # Currency formatters (IDR)
└── types/                    # Database & UI TypeScript interfaces
```

---

> ## ⚠️ UPDATE — this file is superseded for structure & conventions
>
> `AGENT.md` above describes an intended `src/app/` layout that **does not match the
> actual repository** (code lives in root-level `app/`). The authoritative sources are:
>
> 1. **`PRD.md`** — product requirements, scope, metrics, resolved conflicts (§12)
> 2. **`ARCHITECTURE.md`** — routing structure, ADRs, Server Action contracts
> 3. **`DATABASE-SPEC.md`** — schema & Zod (this replaces `SCHEMAS.md`)
> 4. **`DESIGN-SYSTEM.md`** — tokens & components (this replaces `DESIGN.md`)
> 5. **`conductor/product.md`** — machine-readable mirror
>
> **Mandatory reading order before writing any code:**
> `PRD.md` → `ARCHITECTURE.md` → `DATABASE-SPEC.md` + `DESIGN-SYSTEM.md` → then code.
>
> **Product name is KASDESK**, not "Vaultify".
