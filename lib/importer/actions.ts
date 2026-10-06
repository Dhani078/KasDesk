'use server'

import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { transactions, wallets } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { CATEGORY_ENUM } from '@/lib/schemas'

export interface StatementImportItem {
  fingerprint: string
  date: string // YYYY-MM-DD
  type: 'income' | 'expense'
  amount: number
  title: string
  category: string
}

export async function importStatementBatchAction(params: {
  walletId: string
  items: StatementImportItem[]
}): Promise<{ success: boolean; count?: number; error?: string }> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: 'UNAUTHENTICATED' }
  }

  const { walletId, items } = params
  if (!walletId) {
    return { success: false, error: 'Dompet wajib dipilih' }
  }

  if (!items || items.length === 0) {
    return { success: false, error: 'Tidak ada mutasi yang dipilih untuk diimpor' }
  }

  try {
    const inserted = await db.transaction(async (tx) => {
      // 1. Verify wallet ownership
      const [wallet] = await tx
        .select({ id: wallets.id, balance: wallets.balance })
        .from(wallets)
        .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
        .limit(1)

      if (!wallet) {
        throw new Error('Dompet tidak ditemukan atau telah diarsipkan')
      }

      let netBalanceDelta = 0
      let successCount = 0

      for (const item of items) {
        if (!item.amount || item.amount <= 0) continue

        const validCat = CATEGORY_ENUM.includes(item.category as (typeof CATEGORY_ENUM)[number])
          ? (item.category as (typeof CATEGORY_ENUM)[number])
          : 'LAINNYA'

        const occurredDate = new Date(`${item.date}T12:00:00Z`)
        const txId = crypto.randomUUID()

        await tx.insert(transactions).values({
          id: txId,
          userId,
          walletId: wallet.id,
          type: item.type,
          amount: item.amount,
          title: item.title.slice(0, 120),
          categoryTag: validCat,
          note: `Impor Mutasi Rekening (#${item.fingerprint.slice(0, 8)})`,
          occurredAt: Number.isNaN(occurredDate.getTime()) ? new Date() : occurredDate,
        })

        if (item.type === 'income') {
          netBalanceDelta += item.amount
        } else {
          netBalanceDelta -= item.amount
        }
        successCount++
      }

      // Update wallet balance atomically
      if (netBalanceDelta !== 0) {
        if (netBalanceDelta > 0) {
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} + ${netBalanceDelta}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, wallet.id), eq(wallets.userId, userId)))
        } else {
          const debit = Math.abs(netBalanceDelta)
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} - ${debit}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, wallet.id), eq(wallets.userId, userId)))
        }
      }

      return successCount
    })

    revalidatePath('/')
    revalidatePath('/transactions')
    revalidatePath('/wallets')
    revalidatePath(`/wallets/${walletId}`)
    revalidatePath('/insights')

    return { success: true, count: inserted }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal mengimpor mutasi rekening' }
  }
}
