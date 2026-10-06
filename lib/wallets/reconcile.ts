'use server'

import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { wallets, transactions } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'

export interface ReconcileResult {
  diff: number
  newBalance: number
  txId?: string
}

export async function reconcileWalletBalance(params: {
  walletId: string
  targetBalance: number
  note?: string
}): Promise<{ success: boolean; data?: ReconcileResult; error?: string }> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: 'UNAUTHENTICATED' }
  }

  const { walletId, targetBalance, note = 'Rekonsiliasi Saldo (Scan Screenshot)' } = params
  if (targetBalance < 0 || !Number.isFinite(targetBalance)) {
    return { success: false, error: 'Saldo target tidak valid' }
  }

  try {
    const res = await db.transaction(async (tx) => {
      const [wallet] = await tx
        .select({ id: wallets.id, balance: wallets.balance, name: wallets.name })
        .from(wallets)
        .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
        .limit(1)

      if (!wallet) {
        throw new Error('WALLET_NOT_FOUND')
      }

      const current = Number(wallet.balance)
      const diff = targetBalance - current

      if (diff === 0) {
        return { diff: 0, newBalance: current }
      }

      const txType = diff > 0 ? 'income' : 'expense'
      const txAmount = Math.abs(diff)

      // Insert audit transaction row
      const txId = crypto.randomUUID()
      await tx.insert(transactions).values({
        id: txId,
        userId,
        walletId: wallet.id,
        type: txType,
        amount: txAmount,
        title: 'Rekonsiliasi Saldo',
        categoryTag: 'PENYESUAIAN',
        note: `${note} (${diff > 0 ? '+' : '-'}Rp ${txAmount.toLocaleString('id-ID')})`,
        occurredAt: new Date(),
      })

      // Update wallet balance to match target
      await tx
        .update(wallets)
        .set({ balance: targetBalance, updatedAt: new Date() })
        .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)))

      return { diff, newBalance: targetBalance, txId }
    })

    revalidatePath('/')
    revalidatePath('/wallets')
    revalidatePath(`/wallets/${walletId}`)
    return { success: true, data: res }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menyelaraskan saldo' }
  }
}
