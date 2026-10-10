'use client'

import { useState } from 'react'
import { createTransaction } from '@/lib/actions'
import { usePendingTx } from '@/components/pending-tx'
import { enqueueOp } from '@/lib/offline/queue'
import { calculateRoundUp, type RoundUpConfig } from '@/lib/micro-savings'
import { getLocalDateString } from '@/components/quicklog/DateTransactionPicker'
import { hapticSuccess } from '@/lib/haptics'

type WalletLite = { id: string; name: string; balance: number }

interface UseQuickLogSubmitOptions {
  amountText: string
  mathLiveResult: number | null
  txType: 'income' | 'expense' | 'transfer'
  wallets: WalletLite[]
  walletSel: string
  effectiveToWallet: string
  titleText: string
  catSel: string
  noteText: string
  dateText: string
  roundUpConfig: RoundUpConfig
  onClose: () => void
}

export function useQuickLogSubmit({
  amountText,
  mathLiveResult,
  txType,
  wallets,
  walletSel,
  effectiveToWallet,
  titleText,
  catSel,
  noteText,
  dateText,
  roundUpConfig,
  onClose,
}: UseQuickLogSubmitOptions) {
  const { addPending, resolvePending } = usePendingTx()
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    let finalAmountText = amountText
    if (mathLiveResult !== null && mathLiveResult > 0) {
      finalAmountText = String(mathLiveResult)
    }

    const clean = finalAmountText.replace(/[^\d]/g, '')
    const amount = Number(clean)
    if (!clean || !Number.isFinite(amount) || amount <= 0) {
      setError('Masukkan jumlah yang valid')
      return
    }

    if (txType === 'transfer') {
      if (wallets.length < 2) {
        setError('Dibutuhkan minimal 2 dompet untuk transfer saldo.')
        return
      }
      if (!effectiveToWallet || walletSel === effectiveToWallet) {
        setError('Dompet asal dan tujuan tidak boleh sama.')
        return
      }
    }

    setPending(true)
    const fd = new FormData(e.currentTarget)
    const type = String(fd.get('type') ?? txType) as 'income' | 'expense' | 'transfer'
    const sourceName = wallets.find((w) => w.id === walletSel)?.name ?? 'Dompet Asal'
    const toName = wallets.find((w) => w.id === effectiveToWallet)?.name ?? 'Dompet Tujuan'
    const defaultTitle = type === 'transfer' ? `Transfer: ${sourceName} ke ${toName}` : 'Transaksi Baru'
    const rawTitle = titleText.trim() || String(fd.get('title') ?? '').trim()
    const title = rawTitle || defaultTitle
    const categoryTag = catSel
    const note = noteText.trim() ? noteText.trim() : undefined

    const [year, month, day] = dateText.split('-').map(Number)
    const isToday = dateText === getLocalDateString()
    const now = new Date()
    const hours = isToday ? now.getHours() : 12
    const minutes = isToday ? now.getMinutes() : 0
    const seconds = isToday ? now.getSeconds() : 0
    const occurredDate = new Date(year, (month || 1) - 1, day || 1, hours, minutes, seconds)
    const occurredAtIso = occurredDate.toISOString()

    const activeRoundUp = (type === 'expense' && roundUpConfig?.enabled && roundUpConfig.targetVaultId)
      ? calculateRoundUp(amount, roundUpConfig.step)
      : null

    const payload = {
      client_mutation_id: crypto.randomUUID(),
      wallet_id: walletSel,
      to_wallet_id: type === 'transfer' ? effectiveToWallet : undefined,
      type,
      amount,
      title,
      category_tag: type === 'transfer' ? 'LAINNYA' : categoryTag,
      note,
      occurred_at: occurredAtIso,
      round_up_vault_id: activeRoundUp && activeRoundUp.spareChange > 0 ? (roundUpConfig?.targetVaultId ?? undefined) : undefined,
      round_up_amount: activeRoundUp && activeRoundUp.spareChange > 0 ? activeRoundUp.spareChange : undefined,
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await enqueueOp({ kind: 'create-transaction', payload })
        addPending({
          walletId: payload.wallet_id,
          type: payload.type,
          amount: payload.amount,
          title: payload.title,
          categoryTag: payload.category_tag ?? 'LAINNYA',
          createdAt: occurredDate,
        })
        onClose()
        return
      } catch {
        // Fall through to online path
      }
    }

    const clientId = addPending({
      title: payload.title,
      amount: payload.amount,
      type: payload.type,
      walletId: payload.wallet_id,
      categoryTag: payload.category_tag ?? 'LAINNYA',
      createdAt: occurredDate,
    })

    try {
      const res = await createTransaction(payload)

      if (!res.success) {
        resolvePending(clientId, false)
        setError(res.error.message)
        setPending(false)
        return
      }

      resolvePending(clientId, true)
      setSaved(true)
      hapticSuccess()
      setTimeout(() => {
        onClose()
      }, 350)
    } catch {
      resolvePending(clientId, false)
      setError('Tidak dapat menyimpan transaksi. Coba lagi.')
      setPending(false)
    }
  }

  return {
    pending,
    saved,
    error,
    setError,
    handleSubmit,
  }
}
