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

# SCHEMAS.md

## Complete Type-Safe Database & Validation Layer

```typescript
import { z } from 'zod';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const WalletSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(50).trim(),
  balance: z.number(),
  type: z.enum(['e-wallet', 'bank', 'cash']),
  created_at: z.string().datetime(),
});

export const VaultSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(60).trim(),
  target_amount: z.number().positive(),
  current_amount: z.number().nonnegative(),
  due_date: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const DebtSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  person_name: z.string().min(1).max(50).trim(),
  amount: z.number().positive(),
  type: z.enum(['piutang', 'utang']),
  due_date: z.string().nullable(),
  is_paid: z.boolean(),
  notes: z.string().max(200).nullable(),
  created_at: z.string().datetime(),
});

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  wallet_id: z.string().uuid(),
  title: z.string().min(1).max(100).trim(),
  amount: z.number(),
  type: z.enum(['income', 'expense', 'transfer']),
  category_tag: z.string().min(1).max(20).toUpperCase().trim(),
  created_at: z.string().datetime(),
});

export const CreateTransactionSchema = TransactionSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
});

export const GeminiOCRResponseSchema = z.object({
  merchant_name: z.string().default("Unknown Merchant"),
  items: z.array(z.object({
    name: z.string(),
    price: z.number().nonnegative(),
    quantity: z.number().positive().default(1)
  })),
  detected_total: z.number().nonnegative(),
  confidence_score: z.number().min(0).max(1)
});

// ==========================================
// INFERRED TYPESCRIPT INTERFACES
// ==========================================

export type Wallet = z.infer<typeof WalletSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type Vault = z.infer<typeof VaultSchema>;
export type Debt = z.infer<typeof DebtSchema>;
export type GeminiOCRResponse = z.infer<typeof GeminiOCRResponseSchema>;

// Standard Server Action Response
export type ActionResponse<T> = 
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };
```
