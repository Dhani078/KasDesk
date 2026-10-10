import { eq, and, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pushSubscriptions, recurringRules, transactions } from '@/lib/db/schema'
import { sendWebPush } from './vapid'
import { formatCurrency } from '@/lib/currency'

export interface PushNotificationPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Sends a notification payload to all registered push devices of a user.
 */
export async function sendUserPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  let sent = 0
  let failed = 0

  for (const sub of subs) {
    const res = await sendWebPush(sub, payload)
    if (res.success) {
      sent++
    } else {
      failed++
      // If endpoint is 404 or 410 Gone, subscription expired
      if (res.statusCode === 404 || res.statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
      }
    }
  }

  return { sent, failed }
}

/**
 * 1. Pengingat Tagihan H-3 & H-1 (EPIC 8.4).
 * Checks active recurringRules due within 3 days.
 */
export async function checkRecurringRemindersForPush(userId: string): Promise<PushNotificationPayload[]> {
  const now = new Date()
  const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const upcoming = await db
    .select()
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.isActive, 1),
        sql`${recurringRules.nextRunAt} >= ${now}`,
        sql`${recurringRules.nextRunAt} <= ${threeDaysAhead}`
      )
    )

  const notifications: PushNotificationPayload[] = []

  for (const rule of upcoming) {
    const diffMs = new Date(rule.nextRunAt).getTime() - now.getTime()
    const daysLeft = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
    const amountStr = formatCurrency(Number(rule.amount), 'IDR')

    notifications.push({
      title: `Pengingat Tagihan: ${rule.title}`,
      body: `Tagihan sebesar ${amountStr} akan jatuh tempo dalam ${daysLeft} hari.`,
      url: '/planning',
      tag: `bill-${rule.id}`,
    })
  }

  return notifications
}

/**
 * 2. Pengingat Catat Malam 20:00 (EPIC 8.4).
 * Checks if user has logged any transaction today.
 */
export async function checkEveningLogReminderForPush(userId: string): Promise<PushNotificationPayload | null> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [txToday] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.occurredAt} >= ${todayStart}`
      )
    )

  if (Number(txToday?.count || 0) === 0) {
    return {
      title: 'KasDesk: Catat Malam',
      body: 'Ada pengeluaran hari ini yang belum dicatat? Tap untuk 2-tap log!',
      url: '/?action=quicklog',
      tag: 'evening-log-reminder',
    }
  }

  return null
}

/**
 * 3. Peringatan Batas Budget 90% (EPIC 8.4).
 * Checks if category expense has reached 90% or more of monthly budget.
 */
export function checkBudgetThresholdForPush(
  categoryTag: string,
  spent: number,
  budgetAmount: number
): PushNotificationPayload | null {
  if (budgetAmount <= 0) return null
  const ratio = spent / budgetAmount

  if (ratio >= 0.9) {
    const pct = Math.round(ratio * 100)
    const sisa = Math.max(0, budgetAmount - spent)
    const sisaStr = formatCurrency(sisa, 'IDR')

    return {
      title: `Peringatan Budget: #${categoryTag}`,
      body: `Pengeluaran sudah mencapai ${pct}% dari anggaran bulanan. Sisa anggaran: ${sisaStr}.`,
      url: '/planning',
      tag: `budget-warn-${categoryTag}`,
    }
  }

  return null
}
