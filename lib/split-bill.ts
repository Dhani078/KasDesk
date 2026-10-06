/**
 * Smart Split-Bill Algorithm & WhatsApp Settlement Generator (PRD v2.0 §3.2)
 * Proportional tax (PB1), service charge, and voucher discount distribution
 * with zero-difference roundoff guarantee.
 */

export interface SplitItem {
  id: string
  name: string
  price: number
  quantity: number
  /** Member IDs who share this item, or empty array if shared equally among all */
  assignedMemberIds: string[]
}

export interface SplitMember {
  id: string
  name: string
  phoneNumber?: string
}

export interface MemberBillBreakdown {
  memberId: string
  name: string
  itemizedLines: { name: string; amount: number }[]
  subtotal: number
  taxShare: number
  serviceShare: number
  discountShare: number
  totalDue: number
}

export interface SplitBillInput {
  title: string
  members: SplitMember[]
  items: SplitItem[]
  taxAmount?: number
  serviceAmount?: number
  discountAmount?: number
  paymentDetails?: string
}

export interface SplitBillResult {
  title: string
  subtotal: number
  taxAmount: number
  serviceAmount: number
  discountAmount: number
  grandTotal: number
  memberBreakdowns: MemberBillBreakdown[]
}

/**
 * Calculates itemized and proportional split bill.
 * Guarantees that sum(member.totalDue) === grandTotal exactly down to 0 Rupiah.
 */
export function calculateSplitBill(input: SplitBillInput): SplitBillResult {
  const { members, items, taxAmount = 0, serviceAmount = 0, discountAmount = 0 } = input

  if (!members.length) {
    return {
      title: input.title,
      subtotal: 0,
      taxAmount: 0,
      serviceAmount: 0,
      discountAmount: 0,
      grandTotal: 0,
      memberBreakdowns: [],
    }
  }

  // 1. Calculate each member's itemized subtotal
  const memberSubtotals = new Map<string, number>()
  const memberLines = new Map<string, { name: string; amount: number }[]>()
  members.forEach((m) => {
    memberSubtotals.set(m.id, 0)
    memberLines.set(m.id, [])
  })

  let overallSubtotal = 0

  for (const item of items) {
    const itemTotal = Math.max(0, item.price * Math.max(1, item.quantity))
    overallSubtotal += itemTotal

    // Determine who shares this item
    const targetIds =
      item.assignedMemberIds.length > 0
        ? item.assignedMemberIds.filter((id) => memberSubtotals.has(id))
        : members.map((m) => m.id)

    const beneficiaries = targetIds.length > 0 ? targetIds : members.map((m) => m.id)
    const portion = Math.floor(itemTotal / beneficiaries.length)
    let remainder = itemTotal - portion * beneficiaries.length

    beneficiaries.forEach((id) => {
      const extra = remainder > 0 ? 1 : 0
      remainder -= extra
      const cost = portion + extra
      memberSubtotals.set(id, (memberSubtotals.get(id) ?? 0) + cost)
      memberLines.get(id)?.push({
        name: beneficiaries.length > 1 ? `${item.name} (Bagi ${beneficiaries.length})` : item.name,
        amount: cost,
      })
    })
  }

  const safeTax = Math.max(0, taxAmount)
  const safeService = Math.max(0, serviceAmount)
  const safeDiscount = Math.max(0, discountAmount)
  const grandTotal = Math.max(0, overallSubtotal + safeTax + safeService - safeDiscount)

  // 2. Distribute tax, service charge, and discount proportionally
  const breakdowns: MemberBillBreakdown[] = []
  let accumulatedDue = 0
  let maxPayerIdx = 0
  let maxSubtotal = -1

  members.forEach((m, idx) => {
    const sub = memberSubtotals.get(m.id) ?? 0
    const ratio = overallSubtotal > 0 ? sub / overallSubtotal : 1 / members.length

    const tShare = Math.round(safeTax * ratio)
    const sShare = Math.round(safeService * ratio)
    const dShare = Math.round(safeDiscount * ratio)
    const totalDue = Math.max(0, sub + tShare + sShare - dShare)

    if (sub > maxSubtotal) {
      maxSubtotal = sub
      maxPayerIdx = idx
    }

    accumulatedDue += totalDue
    breakdowns.push({
      memberId: m.id,
      name: m.name,
      itemizedLines: memberLines.get(m.id) ?? [],
      subtotal: sub,
      taxShare: tShare,
      serviceShare: sShare,
      discountShare: dShare,
      totalDue,
    })
  })

  // 3. Reconcile rounding discrepancy to the member with largest subtotal
  const diff = grandTotal - accumulatedDue
  if (diff !== 0 && breakdowns[maxPayerIdx]) {
    breakdowns[maxPayerIdx].totalDue += diff
  }

  return {
    title: input.title,
    subtotal: overallSubtotal,
    taxAmount: safeTax,
    serviceAmount: safeService,
    discountAmount: safeDiscount,
    grandTotal,
    memberBreakdowns: breakdowns,
  }
}

/**
 * Generate formatted WhatsApp message for a participant.
 */
export function generateWhatsAppSettlementMessage(
  memberBreakdown: MemberBillBreakdown,
  billTitle: string,
  paymentDetails?: string,
): string {
  const lines = memberBreakdown.itemizedLines
    .map((item) => `• ${item.name}: Rp ${item.amount.toLocaleString('id-ID')}`)
    .join('\n')

  const extraCharges: string[] = []
  if (memberBreakdown.taxShare > 0) {
    extraCharges.push(`• Porsi Pajak (PB1): Rp ${memberBreakdown.taxShare.toLocaleString('id-ID')}`)
  }
  if (memberBreakdown.serviceShare > 0) {
    extraCharges.push(`• Porsi Service: Rp ${memberBreakdown.serviceShare.toLocaleString('id-ID')}`)
  }
  if (memberBreakdown.discountShare > 0) {
    extraCharges.push(`• Potongan Diskon: -Rp ${memberBreakdown.discountShare.toLocaleString('id-ID')}`)
  }

  const extrasText = extraCharges.length ? `\n\n*Pajak & Penyesuaian:*\n${extraCharges.join('\n')}` : ''
  const paymentText = paymentDetails
    ? `\n\n*Pembayaran bisa ditransfer ke:*\n${paymentDetails}`
    : ''

  return `Halo ${memberBreakdown.name}! 👋\nIni rincian patungan kita untuk *${billTitle}*:\n\n*Pesanan:*\n${lines}${extrasText}\n\n*Total Bagianmu: Rp ${memberBreakdown.totalDue.toLocaleString('id-ID')}*${paymentText}\n\nTerima kasih banyak ya! 🙏\n_Dihitung dengan KasDesk_`
}
