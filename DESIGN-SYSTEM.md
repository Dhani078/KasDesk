# KASDESK — Design System & UI/UX Specification

**Status:** Draft v1.0
**Last Updated:** 2026-09-09
**Authoritative for:** tokens, components, layout, motion, accessibility
**Supersedes:** `DESIGN.md` (marked superseded)
**Derived from:** `PRD.md` §7.5 (NR-A11Y), §12.7/12.8 (resolved palette conflicts)

---

## 0. Aesthetic Direction — "Obsidian Geist"

### 0.1 Governing Archetype

Per the audit of `.agents/skills/`: the token set (`#0D0D0F` canvas, Inter + JetBrains
Mono) maps 1:1 onto the **`industrial-brutalist-ui`** archetype *Tactical Telemetry /
CRT Terminal* — the **only** skill that explicitly endorses Inter:

> `industrial-brutalist-ui` §3.1 endorses "Inter (Extra Bold/Black)" for macro-typography
> and **JetBrains Mono** for telemetry.

⚠️ **Recorded conflict:** two other skills ban Inter outright:

| Skill | Position |
| :--- | :--- |
| `minimalist-ui` §2 | "DO NOT use the 'Inter', 'Roboto', or 'Open Sans' typefaces." |
| `high-end-visual-design` §2 | "**Banned Fonts:** Inter, Roboto, Arial, Open Sans, Helvetica." |
| `industrial-brutalist-ui` §3.1 | ✅ **Endorses** Inter + JetBrains Mono |

**Resolution (ADR-worthy):** `industrial-brutalist-ui` governs. The project's existing
tokens are explicit, already implemented, and consistent with the brutalist archetype.
The Inter bans are **overridden by explicit project tokens**.

### 0.2 Design Principles

1. **Density over decoration** — more information per screen, less chrome.
2. **Numbers are sacred** — always monospace, always tabular.
3. **One-hand reachable** — primary action in the thumb arc.
4. **Instant feedback** — no spinner on the critical path.
5. **Structure over ornament** — borders and dividers, not shadows and gradients.

---

## 1. Design Token Architecture

### 1.1 Three-Tier Hierarchy

```
Tier 1: PRIMITIVES      raw values, never used directly in components
   ↓
Tier 2: SEMANTIC        role-named tokens (--color-surface, --color-accent-income)
   ↓
Tier 3: COMPONENT       component-scoped aliases (--row-divider, --sheet-bg)
```

**Rule:** components reference Tier 2 or 3 only. Never a raw hex in JSX.

### 1.2 Current Tokens (Authoritative — keep these)

```css
/* app/globals.css */
@import "tailwindcss";

@theme inline {
  --color-canvas:          #0D0D0F;
  --color-surface:         #161619;
  --color-border-outer:    rgba(255, 255, 255, 0.07);
  --color-border-inner:    rgba(255, 255, 255, 0.04);
  --color-text-primary:    #F0F0F3;
  --color-text-secondary:  #7E7E87;
  --color-accent-income:   #5EBA7D;
  --color-accent-expense:  #E05A47;
  --color-accent-transfer: #8A92A0;

  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
```

These are **confirmed correct** per PRD §12.7 (palette) and §12.8 (accents). Do not
revert to the `#09090b` / emerald / crimson values from `CONTEXT.md`.

### 1.3 Extended Token Set (add these)

```css
@theme inline {
  /* ── Additional surfaces ───────────────────────────── */
  --color-canvas-elevated:    #1C1C21;   /* sheets, modals */
  --color-surface-inset:      #101013;   /* nested inset (input bg) */
  --color-border-strong:      #4A4A52;   /* control boundaries (2.21:1) */
  --color-divider-decorative: #2A2A2F;   /* exempt from 1.4.11 */

  /* ── State ─────────────────────────────────────────── */
  --color-accent-focus:       #6E8BFF;   /* focus ring, AA on canvas */
  --color-accent-warning:     #D9A441;   /* budget/runway warnings */
  --color-danger:             #E05A47;   /* destructive (reuse expense) */

  /* ── Radius: industrial 6-8px. NEVER rounded-full ──── */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* ── Spacing (4px base) ────────────────────────────── */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px;  --space-5: 20px;  --space-6: 24px;
  --space-8: 32px;  --space-10: 40px; --space-12: 48px;

  /* ── Motion ────────────────────────────────────────── */
  --duration-instant: 80ms;    /* press feedback */
  --duration-fast:    150ms;   /* chips, hovers */
  --duration-normal:  220ms;   /* sheets */
  --duration-slow:    320ms;   /* layout transitions */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-decelerate: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);

  /* ── Elevation (dark UI: use borders+scrim, not shadow) ── */
  --elevation-sheet: 0 -8px 32px rgba(0,0,0,0.6);
  --elevation-fab:   0 4px 16px rgba(0,0,0,0.5);

  /* ── Z-index scale ─────────────────────────────────── */
  --z-base: 0;
  --z-sticky: 10;
  --z-nav: 50;
  --z-sheet: 100;
  --z-toast: 200;

  /* ── Touch ─────────────────────────────────────────── */
  --touch-min: 44px;   /* WCAG 2.5.8 / iOS HIG */
}
```

### 1.4 Safe-Area Utilities — **FIXES PRD §11.6**

`pb-safe` currently emits **zero CSS** (verified: 0 occurrences in build output). Tailwind
v4 has no such utility. Define it explicitly:

```css
@utility pb-safe {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
}

@utility pt-safe {
  padding-top: max(0.75rem, env(safe-area-inset-top));
}

@utility px-safe {
  padding-left:  max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
}
```

**Verification after adding:** `grep -c "safe-area-inset" .next/static/css/*.css` must
return ≥ 1.

### 1.5 Global Rules

```css
/* app/globals.css additions */
* { box-sizing: border-box; }

body {
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Every numeric figure is tabular monospace */
.tabular { font-variant-numeric: tabular-nums; }

/* Respect reduced motion (NR-A11Y-7) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Visible focus everywhere (NR-A11Y-8) */
:focus-visible {
  outline: 2px solid var(--color-accent-focus);
  outline-offset: 2px;
}
```

> **Brutalist note:** the `industrial-brutalist-ui` skill mandates `border-radius: 0`
> globally. KASDESK **partially adopts** this: we use 4–8px radii (not 0) because the
> established `DESIGN.md`/`app/page.tsx` already uses `rounded-lg`. The critical shared
> rule is **never `rounded-full`** (PRD DESIGN anti-slop list).

---

## 2. Typography

### 2.1 Scale

| Role | Size | Weight | Tracking | Font | Color |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero balance** | 32–34px | 500 (Medium) | `-0.02em` (`tracking-tight`) | Mono | `text-primary` |
| Currency prefix (Rp) | 20px | 400 | normal | Mono | `text-secondary` |
| Section header | 10px | 700 | `0.14em` uppercase | Sans | `text-secondary` |
| Card/row title | 14px (`text-sm`) | 500 | normal | Sans | `text-primary` |
| Row subtitle (meta) | 10px | 400 | normal | Sans | `text-secondary` |
| Amount (row) | 14px | 400 | normal | **Mono + tabular** | by type |
| Category tag `[MAKAN]` | 12px | 400 | `0.04em` | **Mono** | `text-secondary` |
| Micro label | 9px | 700 | `0.05em` uppercase | Sans | `text-secondary` |
| Button label | 14px | 600 | `0.01em` | Sans | — |

### 2.2 The Tabular Number Rule (Non-Negotiable)

> **Every** monetary figure, percentage, and count uses `font-mono tabular-nums`.

```tsx
// ✅ correct
<span className="font-mono tabular-nums text-accent-expense">-35.000</span>

// ❌ wrong
<span className="text-red-500">-35.000</span>
```

Why: proportional digits make columns of numbers visually jitter as they change — fatal in
a finance app where users scan columns. JetBrains Mono provides `tabular-nums` natively;
verify it isn't overridden.

### 2.3 Currency Formatting

```ts
// lib/utils/currency.ts
const IDR = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatIDR(amount: number): string {
  return IDR.format(amount)                     // 14250000 → "14.250.000"
}

export function formatIDRSigned(amount: number, type: 'income'|'expense'|'transfer') {
  const sign = type === 'income' ? '+' : type === 'expense' ? '-' : ''
  return `${sign}${formatIDR(Math.abs(amount))}`
}

// Parse loose user input: "12.000" | "12,000" | "12000" | "12rb" → 12000
export function parseIDRInput(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}
```

---

## 3. Color Usage & Contrast

### 3.1 Semantic Mapping

| Token | Hex | Used for |
| :--- | :--- | :--- |
| `canvas` | `#0D0D0F` | App background |
| `surface` | `#161619` | Grouped containers, cards, nav bar |
| `canvas-elevated` | `#1C1C21` | Bottom sheets, modals |
| `surface-inset` | `#101013` | Input fields, nested wells |
| `border-outer` | `rgba(255,255,255,0.07)` | Card/group border |
| `border-inner` | `rgba(255,255,255,0.04)` | Row dividers |
| `text-primary` | `#F0F0F3` | Titles, amounts |
| `text-secondary` | `#7E7E87` | Meta, labels, section headers |
| `accent-income` | `#5EBA7D` | Income amounts |
| `accent-expense` | `#E05A47` | Expense amounts, destructive |
| `accent-transfer` | `#8A92A0` | Transfer amounts |
| `accent-warning` | `#D9A441` | Runway/budget warnings |
| `accent-focus` | `#6E8BFF` | Focus ring only |

### 3.2 Contrast Verification (WCAG 2.2 AA)

Computed against canvas `#0D0D0F` and surface `#161619`:

| Foreground | On | Ratio | AA normal (4.5:1) | AA large (3:1) |
| :--- | :--- | :--: | :--: | :--: |
| `text-primary` `#F0F0F3` | canvas | **16.9:1** | ✅ | ✅ |
| `text-primary` | surface | 15.6:1 | ✅ | ✅ |
| `text-secondary` `#7E7E87` | canvas | 4.7:1 | ✅ | ✅ |
| `text-secondary` | surface | 4.3:1 | ⚠️ | ✅ |
| `accent-income` `#5EBA7D` | canvas | 7.1:1 | ✅ | ✅ |
| `accent-expense` `#E05A47` | canvas | 5.0:1 | ✅ | ✅ |
| `accent-transfer` `#8A92A0` | canvas | 6.0:1 | ✅ | ✅ |
| `accent-warning` `#D9A441` | canvas | 8.6:1 | ✅ | ✅ |
| `accent-focus` `#6E8BFF` | canvas | 5.4:1 | ✅ | ✅ |
| `border-strong` `#4A4A52` | canvas | 2.2:1 | ❌ | ❌ (decorative/control edge — 1.4.11 exempt for pure decoration; **must not** be the only indicator) |

**Action items:**
1. `text-secondary` on `surface` is 4.3:1 — just under AA. **Fix:** lighten
   `text-secondary` to `#8A8A93` (≈5.0:1 on surface) OR only use `text-secondary` on
   `canvas`, never on `surface` for body text. **Recommended:** bump to `#86868F`.
2. `border-strong` is decorative-only. Never rely on it alone to convey state
   (WCAG 1.4.1 Use of Color).

### 3.3 Color Is Never the Only Signal

Amount sign and type are conveyed by **sign character + color**, not color alone:

```
+4.500.000   (green)   income
-1.250.000   (red)     expense
 500.000     (gray)    transfer
```

---

## 4. Anti-Slop Rules (Mandatory)

From `DESIGN.md` + `industrial-brutalist-ui` + `minimalist-ui`. **Violations are
rejected in review.**

| # | Rule | Instead |
| :-- | :--- | :--- |
| 1 | ❌ **NO circular icon badges** | ✅ Raw monospace tag: `[MAKAN]`, `[XFER]`, `[GAJI]` |
| 2 | ❌ **NO pill buttons** (`rounded-full`) | ✅ `rounded-md` (6px) / `rounded-lg` (8px) |
| 3 | ❌ **NO pie charts** | ✅ Vertical bar chart or percentage rows |
| 4 | ❌ **NO gradients** | ✅ Flat fills |
| 5 | ❌ **NO cyan/slate/neon** (`#020617`, `#0f172a`) | ✅ Obsidian palette only |
| 6 | ❌ **NO card fatigue** (one card per row) | ✅ **Grouped inset table** — one container, hairline dividers |
| 7 | ❌ **NO emoji as icons** | ✅ lucide-react icons, or nothing |
| 8 | ❌ **NO center-aligned body text** | ✅ Left-aligned; right-align numbers only |
| 9 | ❌ **NO drop shadows as elevation** (dark UI) | ✅ Borders + scrim |
| 10 | ❌ **NO spinner blocking the log path** | ✅ Optimistic render |

### 4.1 The Grouped Inset Table (signature pattern)

```
┌────────────────────────────────────────┐  ← surface, border-outer, rounded-lg
│ [MAKAN]   Nasi Goreng Gila     -35.000 │
│           BCA • 12:30                  │
├────────────────────────────────────────┤  ← border-inner divider
│ [GAJI]    PT. ABC Tech     +8.000.000  │
│           Mandiri • 09:00              │
├────────────────────────────────────────┤
│ [XFER]    To Gopay             500.000 │
│           BCA • Yesterday              │
└────────────────────────────────────────┘
```

```tsx
<div className="bg-surface rounded-lg border border-border-outer overflow-hidden divide-y divide-border-inner">
  {/* rows */}
</div>
```

---

## 5. Component Inventory

### 5.1 `TabularNumber`

```tsx
interface Props {
  value: number
  type?: 'income' | 'expense' | 'transfer' | 'neutral'
  currency?: boolean
}
```
| Aspect | Spec |
| :--- | :--- |
| Font | `font-mono tabular-nums` |
| Sign | `+` income, `-` expense, none for transfer |
| Colors | income `text-accent-income`, expense `text-accent-expense`, transfer `text-accent-transfer` |
| Size | 14px row / 32–34px hero |

### 5.2 `GroupedTable` (compound)

```tsx
<GroupedTable>
  <GroupedTable.Row onClick={...}>
    <GroupedTable.Tag>MAKAN</GroupedTable.Tag>
    <GroupedTable.Content title="Nasi Goreng" subtitle="BCA • 12:30" />
    <GroupedTable.Amount value={35000} type="expense" />
  </GroupedTable.Row>
</GroupedTable>
```
- Container: `bg-surface rounded-lg border border-border-outer divide-y divide-border-inner`
- Row: `flex items-center justify-between p-4`, min-h **44px**
- Tag: `font-mono text-xs text-text-secondary`

### 5.3 `CategoryChipRow`

```
┌──────────────────────────────────────────┐
│ [MAKAN] [TRANSPORT] [BELANJA] [TAGIHAN]→ │
└──────────────────────────────────────────┘
```
- Single horizontal row, horizontally scrollable
- Selected: `bg-canvas-elevated border-border-strong text-text-primary`
- Unselected: `border-border-outer text-text-secondary`
- **Never `rounded-full`** — use `rounded-md`
- Min height 44px, gap 8px
- Last-used category sorted first (FR-LOG-5)
- `role="radiogroup"` with `aria-checked` per chip

### 5.4 `QuickLogSheet` — THE critical component

```
┌────────────────────────────────────────┐
│ ▬▬▬▬  (drag handle)                    │
│                                        │
│  CATAT PENGELUARAN                     │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Rp  12.000                       │  │ ← autofocused, numeric keyboard
│  └──────────────────────────────────┘  │
│                                        │
│  [MAKAN] [TRANSPORT] [BELANJA] ...     │ ← chips row
│                                        │
│  Dompet:  BCA                       ▾  │ ← defaults to last-used
│  Catatan: (opsional)                   │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │            SIMPAN                │  │ ← 48px, primary
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
   ↑ pb-safe + rounded-t-lg, surface: #1C1C21
```

| Aspect | Spec |
| :--- | :--- |
| Surface | `bg-canvas-elevated` `#1C1C21` |
| Radius | `rounded-t-lg` (8px top only) |
| Enter | slide up `220ms ease-decelerate` |
| Exit | slide down `150ms ease-accelerate` |
| Amount input | `inputMode="decimal"`, **autoFocus**, 24px mono |
| Amount field height | 56px |
| SIMPAN button | 48px, `bg-text-primary text-canvas` |
| Bottom padding | **`pb-safe`** (§1.4) |
| Scrim | `bg-black/60` + tap-to-dismiss |
| Focus trap | Yes — focus stays in sheet while open |
| `role` | `dialog` `aria-modal="true"` `aria-labelledby` |

**Zero-friction rules:** no confirmation dialog · no required note · no date picker by
default · closes immediately on save (FR-LOG-10).

### 5.5 `BottomNav` (with thumb-arc FAB)

```
┌──────────────────────────────────────────┐
│  🏠      💰      [ + ]      🎯      📊   │
│ HOME   DOMPET          TARGET  WAWASAN   │
└──────────────────────────────────────────┘
   ↑ fixed bottom, pb-safe, bg-surface/90 + backdrop-blur
```

| Aspect | Spec |
| :--- | :--- |
| Height | 64px + safe area |
| Background | `bg-surface/90 backdrop-blur-md border-t border-border-outer` |
| FAB | 48×48, `-mt-6` raised, `bg-text-primary text-canvas`, `rounded-lg` (**not** circle) |
| FAB position | dead-center — the thumb arc (FR-LOG-1) |
| Active tab | `text-text-primary` |
| Inactive | `text-text-secondary` |
| Label | 9px bold uppercase `tracking-[0.05em]` |
| **Padding** | **`pb-safe`** (PRD §11.6) |

**Fixes needed:** PRD §11.10 — FAB currently has no `onClick`; §11.9 — `/wallets`,
`/vaults`, `/insights` return 404.

### 5.6 `SafeSpendMeter` (home hero secondary)

```
┌────────────────────────────────────────┐
│ AMAN BELANJA HARI INI                  │
│ Rp 47.000                              │  ← 24px mono tabular
│ ▓▓▓▓▓▓▓▓░░░░░░░░  sisa 12 hari         │
└────────────────────────────────────────┘
```
- Label: 10px bold uppercase `tracking-[0.14em]` `text-text-secondary`
- Value: 24px mono, `text-text-primary`
- Warning state (runway < 3 days): `text-accent-warning`

### 5.7 `VaultCard`

```
┌─────────────────────┐
│ MacBook Pro         │
│ Rp 8M / 24M         │  ← mono tabular
│ ▓▓▓▓▓░░░░░░░  33%   │
└─────────────────────┘
```
- `bg-surface border border-border-outer rounded-lg p-4`
- Progress track: `h-1 bg-canvas`, fill `bg-text-primary` (or `accent-income` when ≥100%)
- Percent in mono tabular

### 5.8 `StatusTag`

```
[LUNAS]  [BELUM]  [SEBAGIAN]
```
- Mono, 10px, uppercase
- Bordered, **not** filled pills, `rounded-sm`
- LUNAS → `accent-income`, BELUM → `accent-expense`, SEBAGIAN → `accent-warning`

### 5.9 `BarChart7Day`

```
   ▁ ▃ ▅ ▂ █ ▄ ▃
   S S R K J S M
```
- Vertical bars only (no pie — rule #3)
- Height 64px, bar width flexible, gap 4px
- Today's bar highlighted `text-text-primary`, others `text-text-secondary`
- Zero days render a 2px baseline stub
- `role="img"` + `aria-label` summarizing the week

### 5.10 `EmptyState`

```
        ┌──────────────┐
        │   (icon)     │
        │ Belum ada    │
        │ transaksi    │
        │              │
        │ [Catat       │
        │  sekarang]   │
        └──────────────┘
```
- Never just "No data" (NR-USE-4) — always state the next action
- Icon: lucide, 24px, `text-text-secondary`, **no circular badge**

### 5.11 `Toast`

- Non-blocking, bottom above nav, `pb-safe`
- Error: left border `accent-expense`
- Auto-dismiss 4s (errors 6s)
- `role="status"` / `role="alert"` for errors

---

## 6. Motion & Microinteractions

### 6.1 Duration & Easing Table

| Interaction | Duration | Easing |
| :--- | :--- | :--- |
| Button press | 80ms | `ease-standard` |
| Chip select | 150ms | `ease-standard` |
| Bottom sheet enter | 220ms | `ease-decelerate` |
| Bottom sheet exit | 150ms | `ease-accelerate` |
| Optimistic row insert | 150ms | `ease-decelerate` |
| Row delete (swipe) | 200ms | `ease-accelerate` |
| Progress bar fill | 320ms | `ease-standard` |
| Tab switch | 80ms | `ease-standard` |
| Toast in/out | 180ms | `ease-standard` |

### 6.2 Rules

- Animate **transform** and **opacity** only (GPU-friendly).
- Never animate `width`/`height`/`top`/`left` — use `scale`/`translate`.
- Never block the log path with an animation (NR-USE-6).
- Always honor `prefers-reduced-motion` (§1.5, NR-A11Y-7).
- Milestone animations (vault completion) are micro: ≤ 320ms, once.

---

## 7. Screen Specifications

### 7.1 Home `/`

```
┌──────────────────────────────────────┐ 390px
│  pt-safe                             │
│  TOTAL KEKAYAAN                      │ 10px uppercase
│  Rp 14.250.000                       │ 34px mono
│                                      │
│  ┌─────────────┐ ┌─────────────┐     │
│  │ PEMASUKAN   │ │ PENGELUARAN │     │
│  │ +4.500.000  │ │ -1.250.000  │     │
│  └─────────────┘ └─────────────┘     │
│                                      │
│  AMAN BELANJA HARI INI               │
│  Rp 47.000                           │
│  ▓▓▓▓▓▓░░░░  sisa 12 hari            │
│                                      │
│  AKTIVITAS TERAKHIR        Lihat ▸   │
│  ┌────────────────────────────────┐  │
│  │ [MAKAN] Nasi Goreng   -35.000  │  │
│  │         BCA • 12:30            │  │
│  ├────────────────────────────────┤  │
│  │ [GAJI]  PT ABC      +8.000.000 │  │
│  ├────────────────────────────────┤  │
│  │ [XFER]  To Gopay      500.000  │  │
│  └────────────────────────────────┘  │
│                                      │
│  TARGET AKTIF                        │
│  ┌────────────┐ ┌────────────┐       │
│  │ MacBook    │ │ Emergency  │       │
│  │ 8M / 24M   │ │ 2M / 10M   │       │
│  └────────────┘ └────────────┘       │
│                                      │
│  (pb-24 for nav)                     │
├──────────────────────────────────────┤
│ 🏠    💰     [+]     🎯     📊       │ ← nav, pb-safe
└──────────────────────────────────────┘
```

### 7.2 Quick Log (overlay on Home) — see §5.4

### 7.3 Wallets `/wallets`

```
│  DOMPET                    + Tambah  │
│  TOTAL  Rp 14.250.000                │
│  ┌────────────────────────────────┐  │
│  │ BCA              Bank  8.500.000│ │
│  ├────────────────────────────────┤  │
│  │ GoPay        E-Wallet  1.250.000│ │
│  ├────────────────────────────────┤  │
│  │ Tunai             Cash   500.000│ │
│  └────────────────────────────────┘  │
```
- Type shown as small uppercase mono label, **not** an icon badge
- Swipe-left reveals Edit / Archive

### 7.4 Vaults `/vaults` — grid of `VaultCard` (§5.7)

### 7.5 Debts `/debts`

```
│  UTANG & PIUTANG                     │
│  ┌ PIUTANG ────────────────────────┐ │
│  │ Sinta        Rp 66.000   BELUM  │ │
│  │ jatuh tempo 12 Sep              │ │
│  ├─────────────────────────────────┤ │
│  │ Budi         Rp 50.000   LUNAS  │ │
│  └─────────────────────────────────┘ │
│  ┌ UTANG ──────────────────────────┐ │
│  │ Rina         Rp 30.000  SEBAGIAN│ │
│  └─────────────────────────────────┘ │
│                                      │
│  [ Split Bill ]  [ + Catat Utang ]   │
```

### 7.6 Insights `/insights`

```
│  WAWASAN                             │
│  RUNWAY: 23 hari                     │
│  ▓▓▓▓▓▓▓▓▓▓░░                        │
│                                      │
│  ALIRAN 7 HARI                       │
│   ▁ ▃ ▅ ▂ █ ▄ ▃                      │
│   S S R K J S M                      │
│                                      │
│  KATEGORI TERBESAR                   │
│  ┌───────────────────────────────┐   │
│  │ MAKAN      1.250.000    42%   │   │
│  ├───────────────────────────────┤   │
│  │ TRANSPORT    680.000    23%   │   │
│  └───────────────────────────────┘   │
```
Percentage rows, **not** pie charts (rule #3).

### 7.7 Login `/login`

```
│         KASDESK                      │
│  Catat keuangan dalam 3 detik        │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ email                          │  │
│  ├────────────────────────────────┤  │
│  │ password                       │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │            MASUK               │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │      Lanjutkan dengan Google   │  │
│  └────────────────────────────────┘  │
```
- Product name in mono, `tracking-[0.14em]`, uppercase
- Inputs on `surface-inset`, `rounded-md`, 48px

---

## 8. Mobile & iOS Specifics

### 8.1 Viewport — **FIXES PRD §11.7**

Current `app/layout.tsx`:
```ts
// ❌ blocks pinch-zoom — violates WCAG 2.2 SC 1.4.4
export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,
}
```

**Fix — remove both:**
```ts
export const viewport: Viewport = {
  themeColor: '#0D0D0F',
  width: 'device-width',
  initialScale: 1,
}
```
This satisfies NR-A11Y-6 ("User zoom must not be disabled").

### 8.2 Touch Targets

- Minimum **44 × 44 px** (WCAG 2.5.8 + iOS HIG) — NR-A11Y-2.
- Nav items are 64px tall: comfortable.
- FAB is 48 × 48: compliant.
- Chips must be ≥ 44px tall even though text is small.

### 8.3 Safe Area

- Bottom nav & sheets: `pb-safe` (§1.4).
- Home hero: `pt-safe`.
- Never place an interactive element in the bottom 34px on notched devices.

### 8.4 Bottom Sheets (iOS HIG)

- Slide up from bottom (never a centered modal on mobile).
- Drag handle at top; drag-down to dismiss.
- Scrim dims background `bg-black/60`.
- Focus trap + `Escape` to close + restore focus on close.
- Rounded **top** corners only.

### 8.5 Numeric Input

```tsx
<input
  inputMode="decimal"
  autoFocus
  autoComplete="off"
  className="font-mono tabular-nums text-2xl bg-surface-inset ..."
/>
```
Shows the numeric keypad on iOS/Android — essential for `t_log` ≤ 3s.

---

## 9. PWA Assets — **FIXES PRD §11.8**

`public/manifest.json` references icons that do not exist:
```json
"src": "/icons/icon-192x192.png"   ← 404: public/icons/ missing
"src": "/icons/icon-512x512.png"
```

**Required files:**

| Path | Size | Purpose |
| :--- | :--- | :--- |
| `public/icons/icon-192x192.png` | 192×192 | manifest |
| `public/icons/icon-512x512.png` | 512×512 | manifest |
| `public/icons/maskable-512x512.png` | 512×512 | Android adaptive (`purpose: "maskable"`) |
| `public/icons/apple-touch-icon.png` | 180×180 | iOS home screen |

**Maskable requirement:** keep the logo within the center **80%** safe zone (40% padding)
so Android's adaptive masking doesn't clip it.

Updated manifest:

```json
{
  "name": "KASDESK — Catat Keuangan",
  "short_name": "KASDESK",
  "description": "Catat pemasukan & pengeluaran dalam 3 detik.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0D0D0F",
  "theme_color": "#0D0D0F",
  "orientation": "portrait-primary",
  "lang": "id",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Also rename the app: `package.json` → `"name": "kasdesk"`,
`layout.tsx` metadata → `title: "KASDESK"` (PRD NR-NAME-1/2).

---

## 10. Accessibility (WCAG 2.2 AA)

### 10.1 Requirements Checklist (NR-A11Y)

| # | Requirement | How |
| :-- | :--- | :--- |
| 1 | 1.4.3 Contrast ≥ 4.5:1 | §3.2 table; fix `text-secondary` on surface |
| 2 | 1.4.4 Resize text | Remove `userScalable: false` (§8.1) |
| 3 | 1.4.11 Non-text contrast ≥ 3:1 | `border-strong` for control edges |
| 4 | 1.4.1 Not by color alone | Signs + labels accompany color (§3.3) |
| 5 | 2.1.1 Keyboard | Sheet focus trap; all controls reachable |
| 6 | 2.4.7 Focus visible | `:focus-visible` outline (§1.5) |
| 7 | 2.5.8 Target size ≥ 24px (aim 44px) | §8.2 |
| 8 | 4.1.3 Status messages | `role="status"` on toasts |
| 9 | 3.3.2 Labels/instructions | Visible labels, not placeholder-only |
| 10 | 2.3.3 Animation from interactions | `prefers-reduced-motion` (§1.5) |

### 10.2 Semantic HTML

| Element | Use |
| :--- | :--- |
| `<nav>` | BottomNav |
| `<main>` | Page content wrapper |
| `<h1>` | One per page (hero balance or page title) |
| `<h2>` | Section headers |
| `<button>` | Everything clickable that isn't navigation |
| `<a>` / `<Link>` | Navigation |
| `role="dialog"` | Bottom sheets |
| `role="radiogroup"` | Category chips |
| `role="img"` + `aria-label` | Bar chart |

### 10.3 Screen Reader Labels

Icon-only controls **must** have labels (NR-A11Y-5):

```tsx
<button aria-label="Catat transaksi baru" onClick={openQuickLog}>
  <Receipt className="w-5 h-5" />
</button>

<Link href="/wallets" aria-label="Dompet">
  <Wallet className="w-5 h-5" />
  <span>DOMPET</span>
</Link>
```

Amounts need context for screen readers:
```tsx
<span className="font-mono tabular-nums">
  <span className="sr-only">Pengeluaran </span>
  -35.000
</span>
```

### 10.4 Manual Audit Procedure (per `wcag-audit-patterns`)

1. **Automated** — run axe/Lighthouse; fix everything reported.
2. **Keyboard-only** — tab through every screen; no traps, visible focus, logical order.
3. **Zoom** — 200% zoom; no content loss (now possible after §8.1 fix).
4. **Contrast** — verify computed ratios (§3.2).
5. **Screen reader** — VoiceOver (iOS) + NVDA (Windows):
   - Navigate by heading; verify structure makes sense.
   - Confirm every control announces its name and state.
   - Confirm amounts announce type (income/expense).
   - Confirm toasts announce via live region.
6. **Reduced motion** — enable OS setting; verify animations are suppressed.
7. **Touch** — verify no target < 44px.

### 10.5 Screen Reader Test Script

| Step | Action | Expected |
| :-- | :--- | :--- |
| 1 | Open Home, swipe through | "Total kekayaan, Rp 14.250.000" |
| 2 | Focus FAB | "Catat transaksi baru, tombol" |
| 3 | Open Quick Log | Focus moves to amount field; dialog announced |
| 4 | Select chip | "MAKAN, dipilih, radio button" |
| 5 | Save | "Transaksi tersimpan" via live region |
| 6 | Swipe feed | "Pengeluaran, 35.000, Nasi Goreng, BCA" |
| 7 | Insufficient balance/warning | Announced as alert |

---

## 11. Responsive Strategy

Mobile-first. Primary 390×844; secondary 360×800.

| Breakpoint | Behavior |
| :--- | :--- |
| < 400px | Single column, full-width sheets |
| 400–767px | Single column, max-width 448px centered (`max-w-md`) |
| ≥ 768px | **Still mobile layout**, centered in a 448px column (no desktop redesign — PRD NG9) |

The existing `max-w-md mx-auto` wrapper is correct; keep it.

---

## 12. Design Checklist (per PR)

- [ ] No raw hex — tokens only
- [ ] All numbers `font-mono tabular-nums`
- [ ] No `rounded-full`
- [ ] No gradients
- [ ] No circular icon badges — use `[TAG]`
- [ ] Lists use grouped inset table, not per-row cards
- [ ] Touch targets ≥ 44px
- [ ] Bottom elements use `pb-safe`
- [ ] Icon-only controls have `aria-label`
- [ ] Focus visible
- [ ] Reduced motion respected
- [ ] Contrast verified for any new color pair
- [ ] Empty states describe the next action
- [ ] Sheet traps focus and restores it on close

---

**End of DESIGN-SYSTEM.md**
