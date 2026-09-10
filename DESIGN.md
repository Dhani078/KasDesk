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

# DESIGN.md

## Obsidian Geist Design System

### 1. Color Palette Tokens
- **Canvas / Background:** `#0D0D0F` (Deep Obsidian Black)
- **Inset Surface:** `#161619` (Apple Grouped Surface)
- **Hairline Outer Border:** `1px solid rgba(255, 255, 255, 0.07)`
- **Hairline Inner Divider:** `1px solid rgba(255, 255, 255, 0.04)`
- **Text Primary:** `#F0F0F3` (Warm Off-White)
- **Text Secondary / Muted:** `#7E7E87` (Muted Graphite)
- **Income Accent:** `#5EBA7D` (Muted Sage Green - Raw Text)
- **Expense Accent:** `#E05A47` (Terracotta Brick - Raw Text)
- **Transfer Accent:** `#8A92A0` (Steel Gray - Raw Text)

### 2. Typography Rules
- **Primary Body Font:** SF Pro, Inter, or system sans-serif.
- **Financial & Tabular Data:** Strict Monospace (`font-mono`, `tabular-nums`).
- **Hero Balance Figures:** 32px–34px Medium (`tracking-tight`).
- **Section Headers:** 10px Bold Uppercase (`tracking-[0.14em]`, `#7E7E87`).

### 3. Anti-AI Slop Negative Constraints
- **NO Generic Slate/Cyan:** Strictly ban `#020617`, `#0f172a`, and neon cyan gradients.
- **NO Card Fatigue:** Never wrap individual list items in separate floating cards. Group all items inside ONE outer container with inner hairline dividers (`Grouped Inset Table`).
- **NO Circular Icon Badges:** Do not place colored circular backgrounds behind icons. Use clean, raw monospace text tags (e.g., `[WARTEG]`, `[XFER]`, `[ORTU]`).
- **NO Pill Buttons:** Do not use `rounded-full` on buttons. Use crisp 6px–8px industrial radii (`rounded-lg`).
- **NO Pie Charts:** Use compact vertical bar charts or percentage rows.

### 4. Layout Architecture
- **Mobile Viewport Target:** `390px x 844px`.
- Sticky bottom navigation bar with top border hairline divider.
- Modal dialogs must render as slide-up bottom sheets with `#161619` surface.
