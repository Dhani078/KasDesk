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

# REACTIVITY.md

## High-Performance Reactive State & Server Actions Architecture

### 1. Standard Server Action Pattern (Safe & Reusable)

```typescript
'use server'

import { createServerClient } from '@/lib/supabase/server';
import { CreateTransactionSchema, ActionResponse } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

export async function createTransactionAction(
  rawInput: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    // 1. Strict Schema Validation
    const validatedData = CreateTransactionSchema.parse(rawInput);
    
    // 2. Auth Session Check
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, data: null, error: "Unauthorized access" };
    }

    // 3. Atomic Database Mutation (Anti-SQLi ORM Call)
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    // 4. Revalidate PWA UI Cache
    revalidatePath('/');
    return { success: true, data: { id: data.id }, error: null };

  } catch (err: any) {
    return { 
      success: false, 
      data: null, 
      error: err instanceof Error ? err.message : "Internal Server Error" 
    };
  }
}
```
