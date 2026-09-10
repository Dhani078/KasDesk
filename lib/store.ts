import { create } from 'zustand'
import type { Transaction } from '@/lib/db/schema'

interface KasdeskState {
  transactions: Transaction[]
  optimisticAddTransaction: (tx: Transaction) => void
  optimisticRemoveTransaction: (id: string) => void
  setTransactions: (txs: Transaction[]) => void
}

export const useKasdeskStore = create<KasdeskState>((set) => ({
  transactions: [],

  optimisticAddTransaction: (tx) =>
    set((state) => ({ transactions: [tx, ...state.transactions] })),

  optimisticRemoveTransaction: (id) =>
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })),

  setTransactions: (txs) => set({ transactions: txs }),
}))
