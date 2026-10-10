'use client'

import { useState, useEffect, useTransition } from 'react'
import { Users, X } from 'lucide-react'
import {
  calculateSplitBill,
  generateWhatsAppSettlementMessage,
  type SplitMember,
  type SplitItem,
} from '@/lib/split-bill'
import { createDebt } from '@/lib/actions'
import { SplitBillMembersSection } from '@/components/splitbill/SplitBillMembersSection'
import { SplitBillItemsSection } from '@/components/splitbill/SplitBillItemsSection'
import { SplitBillResultsSection } from '@/components/splitbill/SplitBillResultsSection'

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
            <SplitBillMembersSection
              members={members}
              onRemoveMember={handleRemoveMember}
              newMemberName={newMemberName}
              onNewMemberNameChange={setNewMemberName}
              onAddMember={handleAddMember}
            />

            {/* Line Items Section */}
            <SplitBillItemsSection
              items={items}
              members={members}
              onRemoveItem={handleRemoveItem}
              newItemName={newItemName}
              onNewItemNameChange={setNewItemName}
              newItemPrice={newItemPrice}
              onNewItemPriceChange={(val) => setNewItemPrice(formatDots(val))}
              newItemAssign={newItemAssign}
              onNewItemAssignChange={setNewItemAssign}
              onAddItem={handleAddItem}
            />

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
            <SplitBillResultsSection
              splitResult={splitResult}
              savedDebtIds={savedDebtIds}
              isPendingDebt={isPendingDebt}
              copiedId={copiedId}
              onCopyWA={handleCopyWA}
              onShareWA={handleShareWA}
              onSaveAsDebt={handleSaveAsDebt}
            />
          </div>
        </div>
      )}
    </>
  )
}
