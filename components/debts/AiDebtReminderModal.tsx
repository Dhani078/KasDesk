'use client'

import { useState } from 'react'
import { Sparkles, MessageCircle, Copy, Check, X, ExternalLink } from 'lucide-react'
import {
  generateDebtReminderMessage,
  type ReminderTone,
} from '@/lib/debts/ai-reminder'
import { formatIDR } from '@/lib/format'

interface ReceivableItem {
  id: string
  personName: string
  amount: number
  paidAmount: number
  dueDate: string | null
}

export function AiDebtReminderModal({
  receivables = [],
}: {
  receivables: ReceivableItem[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(receivables[0]?.id || '')
  const [tone, setTone] = useState<ReminderTone>('santun')
  const [bankOrWallet, setBankOrWallet] = useState('BCA / SeaBank')
  const [accountNumber, setAccountNumber] = useState('')
  const [copied, setCopied] = useState(false)

  const selectedDebt = receivables.find((r) => r.id === selectedId) || receivables[0]
  const remaining = selectedDebt ? Math.max(0, Number(selectedDebt.amount) - Number(selectedDebt.paidAmount || 0)) : 0

  const previewMessage = selectedDebt
    ? generateDebtReminderMessage({
        personName: selectedDebt.personName,
        amount: remaining,
        dueDate: selectedDebt.dueDate,
        bankOrEwallet: accountNumber.trim() ? bankOrWallet : undefined,
        accountNumber: accountNumber.trim() || undefined,
        tone,
      })
    : ''

  const handleCopy = () => {
    if (!previewMessage) return
    navigator.clipboard.writeText(previewMessage).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenWhatsApp = () => {
    if (!previewMessage) return
    const url = `https://wa.me/?text=${encodeURIComponent(previewMessage)}`
    window.open(url, '_blank')
  }

  if (receivables.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 active:scale-95 cursor-pointer"
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI Pengingat WA
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <div className="surface-card w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-border-outer space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-inner">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile !h-9 !w-9 text-accent">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">AI Pengingat Piutang</h3>
                  <p className="text-xs text-text-secondary">Draf pesan WhatsApp ramah &amp; anti-canggung</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-white/[0.05]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-text-secondary mb-1">Pilih Orang yang Berutang:</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full rounded-xl border border-border-outer bg-canvas px-3 py-2 text-text-primary text-sm focus:border-accent focus:outline-none"
                >
                  {receivables.map((r) => {
                    const rem = Math.max(0, Number(r.amount) - Number(r.paidAmount || 0))
                    return (
                      <option key={r.id} value={r.id}>
                        {r.personName} — Sisa: {formatIDR(rem)}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-text-secondary mb-1">Pilih Gaya Bahasa (Tone):</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['santun', 'santai', 'tegas'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`rounded-xl py-1.5 text-xs font-semibold capitalize border transition ${
                        tone === t
                          ? 'bg-accent-solid text-white border-accent'
                          : 'border-border-outer bg-white/[0.02] text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-text-secondary mb-1">Nama Bank / E-Wallet:</label>
                  <input
                    type="text"
                    placeholder="BCA / SeaBank / GoPay"
                    value={bankOrWallet}
                    onChange={(e) => setBankOrWallet(e.target.value)}
                    className="w-full rounded-xl border border-border-outer bg-canvas px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary mb-1">Nomor Rekening (Opsional):</label>
                  <input
                    type="text"
                    placeholder="1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full rounded-xl border border-border-outer bg-canvas px-2.5 py-1.5 text-xs font-mono text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Preview Box */}
            <div className="rounded-2xl border border-border-outer bg-canvas p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-border-inner/60 pb-1.5">
                <span className="font-semibold text-text-secondary">Pratinjau Pesan:</span>
                <span className="text-[10px] text-accent">Gaya: #{tone}</span>
              </div>
              <p className="whitespace-pre-wrap font-sans text-xs text-text-primary leading-relaxed max-h-36 overflow-y-auto">
                {previewMessage}
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border-outer bg-surface py-2.5 text-xs font-semibold text-text-primary transition hover:border-accent/40 active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-accent-income" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-accent-solid py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Buka WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
