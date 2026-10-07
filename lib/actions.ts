'use server'

/**
 * KasDesk Server Actions barrel.
 *
 * Modularized submodules:
 * - transactions: createTransaction, deleteTransaction, updateTransaction, getRecentTransactions
 * - wallets: getWallets, getWalletsIncludingArchived, createWallet, archiveWallet, getCategories
 * - vaults: getVaults, createVault, depositToVault, withdrawFromVault, deleteVault
 * - debts: getDebts, createDebt, settleDebt, deleteDebt
 * - dashboard: getDashboard, getSpendingFlow, getTopCategories
 */

export * from './actions/transactions'
export * from './actions/wallets'
export * from './actions/vaults'
export * from './actions/debts'
export * from './actions/dashboard'
