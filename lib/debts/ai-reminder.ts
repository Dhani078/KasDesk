export type ReminderTone = 'santun' | 'santai' | 'tegas'

export interface DebtReminderParams {
  personName: string
  amount: number
  dueDate?: string | Date | null
  bankOrEwallet?: string
  accountNumber?: string
  tone: ReminderTone
}

export function generateDebtReminderMessage(params: DebtReminderParams): string {
  const { personName, amount, dueDate, bankOrEwallet, accountNumber, tone } = params
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

  const dateStr = dueDate
    ? new Date(dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const paymentDetail = bankOrEwallet && accountNumber
    ? `\n\nBisa ditransfer ke:\n${bankOrEwallet} : ${accountNumber}`
    : ''

  if (tone === 'santai') {
    return (
      `Halo ${personName}! Mau ngingetin santai nih soal titipan/patungan kemarin sebesar *${formattedAmount}*${
        dateStr ? ` (jadwalnya sekitar ${dateStr})` : ''
      }. Kalau udah senggang boleh ditransfer yaa, makasih banyak! 🙏` + paymentDetail
    )
  }

  if (tone === 'tegas') {
    return (
      `Halo ${personName}, pengingat untuk kewajiban pembayaran sebesar *${formattedAmount}*${
        dateStr ? ` yang jatuh tempo pada tanggal ${dateStr}` : ''
      }. Mohon konfirmasi dan penyelesaiannya hari ini ya. Terima kasih atas kerja samanya.` + paymentDetail
    )
  }

  // Default: Santun & Sopan
  return (
    `Halo ${personName}, semoga harimu lancar. Sekadar mengingatkan secara baik-baik terkait kewajiban sebesar *${formattedAmount}*${
      dateStr ? ` dengan estimasi waktu ${dateStr}` : ''
    }. Jika sudah ada kesempatan, mohon dibantu penyelesaiannya ya. Terima kasih banyak atas pengertiannya.` +
    paymentDetail
  )
}
