'use client'

import { useState, useEffect, useTransition } from 'react'
import { Users, Plus, Trash2, X, Copy, Check, MessageCircle, Wallet } from 'lucide-react'
import {
  calculateSplitBill,
  generateWhatsAppSettlementMessage,
  type SplitMember,
  type SplitItem,
} from '@/lib/split-bill'
import { formatIDR } from '@/lib/format'
import { createDebt } from '@/lib/actions'

export function SplitBillModal({ defaultTitle = 'Makan Bersama' }: { defaultTitle?: string }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(defaultTitle)
  const [members, setMembers] = useState<SplitMember[]>([
    { id: 'm1', name: 'Saya' },
    { id: 'm2', name: 'Teman 1' },
  ])
  const [newMemberName, setNewMemberName] = useState('')

  const [items, setItems] = useState<SplitItem[]>([
    { id: 'i1', name: 'Menu 1', price: 35000, quantity: 1, assignedMemberIds: ['m1'] },
    { id: 'i2', name: 'Menu 2', price: 45000, quantity: 1, assignedMemberIds: ['m2'] },
  ])
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemAssign, setNewItemAssign] = useState<string>('all')

  const [taxPercent, setTaxPercent] = useState<number>(10) // PB1 standard 10%
  const [servicePercent, setServicePercent] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<string>('0')
  const [paymentDetails, setPaymentDetails] = useState('BCA / QRIS')

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [savedDebtIds, setSavedDebtIds] = useState<Record<string, boolean>>({})
  const [isPendingDebt, startDebtTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  function formatDots(v: string) {
    const digits = v.replace(/\D/g, '')
    if (!digits) return ''
    return digits.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  // Calculate items subtotal
  const rawSubtotal = items.reduce((sum, item) => sum + item.price * Math.max(1, item.quantity), 0)
  const taxNominal = Math.round(rawSubtotal * (taxPercent / 100))
  const serviceNominal = Math.round(rawSubtotal * (servicePercent / 100))
  const discountNominal = Number(discountAmount.replace(/\D/g, '') || 0)

  const splitResult = calculateSplitBill({
    title,
    members,
    items,
    taxAmount: taxNominal,
    serviceAmount: serviceNominal,
    discountAmount: discountNominal,
    paymentDetails,
  })

  function handleAddMember() {
    const trimmed = newMemberName.trim()
    if (!trimmed) return
    const id = `m_${Date.now()}`
    setMembers((prev) => [...prev, { id, name: trimmed }])
    setNewMemberName('')
  }

  function handleRemoveMember(id: string) {
    if (members.length <= 1) return
    setMembers((prev) => prev.filter((m) => m.id !== id))
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        assignedMemberIds: item.assignedMemberIds.filter((mId) => mId !== id),
      })),
    )
  }

  function handleAddItem() {
    const name = newItemName.trim() || 'Menu Tambahan'
    const price = Number(newItemPrice.replace(/\D/g, '') || 0)
    if (price <= 0) return

    const id = `i_${Date.now()}`
    const assignedMemberIds = newItemAssign === 'all' ? [] : [newItemAssign]
    setItems((prev) => [...prev, { id, name, price, quantity: 1, assignedMemberIds }])
    setNewItemName('')
    setNewItemPrice('')
  }

  function handleRemoveItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  async function handleCopyWA(memberBreakdown: (typeof splitResult.memberBreakdowns)[0]) {
    const text = generateWhatsAppSettlementMessage(memberBreakdown, title, paymentDetails)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(memberBreakdown.memberId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }

  function handleShareWA(memberBreakdown: (typeof splitResult.memberBreakdowns)[0]) {
    const text = generateWhatsAppSettlementMessage(memberBreakdown, title, paymentDetails)
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleSaveAsDebt(memberBreakdown: (typeof splitResult.memberBreakdowns)[0]) {
    if (memberBreakdown.totalDue <= 0 || savedDebtIds[memberBreakdown.memberId]) return

    startDebtTransition(async () => {
      const res = await createDebt({
        direction: 'piutang',
        person_name: memberBreakdown.name,
        amount: memberBreakdown.totalDue,
        note: `Patungan ${title}`,
      })
      if (res.success) {
        setSavedDebtIds((prev) => ({ ...prev, [memberBreakdown.memberId]: true }))
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2 text-xs font-semibold text-accent shadow-sm transition hover:bg-accent/20 active:scale-95 cursor-pointer"
      >
        <Users className="h-4 w-4" />
        Bagi Tagihan (Split Bill)
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kalkulator Split Bill Patungan"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-3xl border border-border-outer bg-surface p-5 sm:p-6 shadow-2xl animate-fade-in-up my-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-inner pb-3">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile !h-9 !w-9 text-accent">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Hitung Patungan (Split Bill)</h3>
                  <p className="text-xs text-text-secondary">Bagi adil subtotal, pajak PB1, &amp; service charge</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg cursor-pointer"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Title & Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="bill-title" className="mb-1 block font-medium text-text-secondary">
                  Nama Acara / Resto
                </label>
                <input
                  id="bill-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Makan di Solaria"
                  className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-text-primary outline-none focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="bill-payment" className="mb-1 block font-medium text-text-secondary">
                  Rekening / QRIS Pembayaran
                </label>
                <input
                  id="bill-payment"
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder="Contoh: BCA 123456 a.n Budi"
                  className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-text-primary outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Participants Section */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                Partisipan ({members.length})
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {members.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs border border-border-outer text-text-primary"
                  >
                    <span>{m.name}</span>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-text-secondary hover:text-danger cursor-pointer ml-0.5"
                        aria-label={`Hapus ${m.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddMember()
                    }
                  }}
                  placeholder="Nama teman baru..."
                  className="flex-1 rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/[0.06] border border-border-outer px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-white/[0.1] active:scale-95 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah
                </button>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                Daftar Pesanan ({items.length})
              </span>
              <div className="max-h-36 overflow-y-auto divide-y divide-border-inner rounded-2xl border border-border-outer bg-canvas/60">
                {items.map((it) => {
                  const targetName =
                    it.assignedMemberIds.length === 0
                      ? 'Bagi Rata Semua'
                      : members.find((m) => m.id === it.assignedMemberIds[0])?.name || 'Tertentu'
                  return (
                    <div key={it.id} className="flex items-center justify-between p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary truncate">{it.name}</p>
                        <p className="text-[11px] text-text-secondary">
                          Untuk: <span className="text-accent font-medium">{targetName}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-semibold text-text-primary">
                          {formatIDR(it.price * Math.max(1, it.quantity))}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          className="text-text-secondary hover:text-danger p-1 cursor-pointer"
                          aria-label={`Hapus ${it.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add Item Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Nama menu..."
                  className="rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(formatDots(e.target.value))}
                  placeholder="Harga (Rp)..."
                  className="rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                />
                <div className="flex items-center gap-1.5">
                  <select
                    value={newItemAssign}
                    onChange={(e) => setNewItemAssign(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-canvas px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                  >
                    <option value="all">Bagi Rata</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Extra Charges (Tax, Service, Voucher) */}
            <div className="grid grid-cols-3 gap-2 border-t border-border-inner pt-3 text-xs">
              <div>
                <label className="mb-1 block text-text-secondary text-[11px]">Pajak PB1 (%)</label>
                <select
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-canvas px-2.5 py-1.5 text-xs text-text-primary outline-none"
                >
                  <option value={0}>0%</option>
                  <option value={10}>10% (PB1)</option>
                  <option value={11}>11% (PPN)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-text-secondary text-[11px]">Service (%)</label>
                <select
                  value={servicePercent}
                  onChange={(e) => setServicePercent(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-canvas px-2.5 py-1.5 text-xs text-text-primary outline-none"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={10}>10%</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-text-secondary text-[11px]">Diskon (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(formatDots(e.target.value))}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-canvas px-2.5 py-1.5 text-xs text-text-primary outline-none"
                />
              </div>
            </div>

            {/* Split Results Summary */}
            <div className="space-y-3 rounded-2xl border border-accent/20 bg-accent/[0.04] p-4">
              <div className="flex items-center justify-between border-b border-border-inner pb-2 text-xs">
                <div>
                  <span className="text-text-secondary">Total Tagihan Keseluruhan</span>
                  <p className="font-mono text-base font-bold text-text-primary">{formatIDR(splitResult.grandTotal)}</p>
                </div>
                <div className="text-right text-[11px] text-text-secondary">
                  <span>Pajak: {formatIDR(splitResult.taxAmount)}</span>
                  {splitResult.serviceAmount > 0 && <span> · Service: {formatIDR(splitResult.serviceAmount)}</span>}
                </div>
              </div>

              {/* Individual Breakdown Cards */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {splitResult.memberBreakdowns.map((mb) => {
                  const isSavedDebt = savedDebtIds[mb.memberId]
                  const isCopied = copiedId === mb.memberId
                  const isSelf = mb.name.toLowerCase() === 'saya'

                  return (
                    <div
                      key={mb.memberId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-border-outer bg-surface p-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text-primary">{mb.name}</p>
                          <span className="font-mono font-bold text-accent text-sm">{formatIDR(mb.totalDue)}</span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">
                          Subtotal: {formatIDR(mb.subtotal)}
                          {mb.taxShare > 0 && ` + Pajak: ${formatIDR(mb.taxShare)}`}
                          {mb.serviceShare > 0 && ` + Svc: ${formatIDR(mb.serviceShare)}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleCopyWA(mb)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border-outer bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary active:scale-95 cursor-pointer"
                          title="Salin rincian teks"
                        >
                          {isCopied ? <Check className="h-3 w-3 text-accent-income" /> : <Copy className="h-3 w-3" />}
                          {isCopied ? 'Tersalin' : 'Salin'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareWA(mb)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 px-2.5 py-1.5 text-[11px] font-semibold text-[#25D366] hover:bg-[#25D366]/25 active:scale-95 cursor-pointer"
                          title="Kirim ke WhatsApp"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </button>

                        {!isSelf && (
                          <button
                            type="button"
                            disabled={isSavedDebt || isPendingDebt}
                            onClick={() => handleSaveAsDebt(mb)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border-outer bg-white/[0.03] px-2 py-1.5 text-[11px] font-medium text-text-secondary hover:text-accent hover:border-accent/40 active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="Simpan sebagai piutang aktif"
                          >
                            <Wallet className="h-3 w-3" />
                            {isSavedDebt ? 'Tercatat ✓' : 'Piutang'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
