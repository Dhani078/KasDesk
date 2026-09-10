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

# SECURITY.md

## Vaultify Hardened Security Specification

### 1. SQL Injection Prevention
- **Supabase Query Engine:** All database operations must utilize the Supabase Client ORM (`supabase.from('table').select().eq('column', value)`), which automatically parameterizes all inputs under the hood.
- **Raw SQL Restriction:** Direct `client.query("SELECT * FROM ...")` or template literal interpolation (`${input}`) is strictly forbidden in Server Actions and API Routes.
- **Stored Procedures:** For multi-table operations (e.g., updating wallet balance during a transaction insert), use atomic PostgreSQL Functions (RPC) defined with typed input parameters.

### 2. Input Validation & Sanitization (Zod Layer)
Every Server Action must validate inputs against a Zod schema BEFORE reaching the database:

```typescript
// lib/schemas/transaction.ts
import { z } from 'zod';

export const CreateTransactionSchema = z.object({
  wallet_id: z.string().uuid({ message: "Invalid Wallet ID format" }),
  title: z.string().min(1, "Title required").max(100).trim(),
  amount: z.number().positive("Amount must be greater than 0"),
  type: z.enum(['income', 'expense', 'transfer']),
  category_tag: z.string().min(1).max(20).toUpperCase().trim(),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
```

### 3. Row Level Security (RLS) Verification
```sql
-- Security Policy Verification
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strict User Isolation - Transactions"
ON public.transactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```
