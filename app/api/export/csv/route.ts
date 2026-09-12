import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions, wallets } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export async function GET() {
  const userId = await requireUserId()
  if (!userId) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })

  const [walletRows, txRows] = await Promise.all([
    db.select({ id: wallets.id, name: wallets.name }).from(wallets).where(eq(wallets.userId, userId)),
    db.select().from(transactions).where(eq(transactions.userId, userId)),
  ])
  const walletNames = new Map(walletRows.map((wallet) => [wallet.id, wallet.name]))
  const header = ['id', 'tanggal', 'jenis', 'judul', 'kategori', 'dompet_asal', 'dompet_tujuan', 'jumlah', 'catatan']
  const rows = txRows.map((tx) => [
    tx.id,
    tx.occurredAt,
    tx.type,
    tx.title,
    tx.categoryTag ?? 'LAINNYA',
    walletNames.get(tx.walletId) ?? tx.walletId,
    tx.toWalletId ? walletNames.get(tx.toWalletId) ?? tx.toWalletId : '',
    tx.amount,
    tx.note ?? '',
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="kasdesk-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
