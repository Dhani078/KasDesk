'use server'

import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { getVapidKeys } from './vapid'
import { sendUserPushNotification } from './notifications'

export async function getVapidPublicKeyAction(): Promise<string> {
  const { publicKey } = getVapidKeys()
  return publicKey
}

export async function savePushSubscriptionAction(params: {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}): Promise<{ success: boolean; error?: string }> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: 'Sesi berakhir' }

  if (!params.endpoint || !params.p256dh || !params.auth) {
    return { success: false, error: 'Kunci langganan push tidak lengkap' }
  }

  try {
    const [existing] = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, params.endpoint))
      .limit(1)

    if (existing) {
      await db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dh: params.p256dh,
          auth: params.auth,
          userAgent: params.userAgent || null,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existing.id))
    } else {
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint: params.endpoint,
        p256dh: params.p256dh,
        auth: params.auth,
        userAgent: params.userAgent || null,
      })
    }

    return { success: true }
  } catch (err) {
    console.error('[savePushSubscriptionAction Error]', err)
    return { success: false, error: 'Gagal menyimpan langganan notifikasi' }
  }
}

export async function removePushSubscriptionAction(
  endpoint: string
): Promise<{ success: boolean }> {
  const userId = await requireUserId()
  if (!userId) return { success: false }

  try {
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function getPushSubscriptionStatusAction(): Promise<{
  subscribed: boolean
  count: number
}> {
  const userId = await requireUserId()
  if (!userId) return { subscribed: false, count: 0 }

  const subs = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  return {
    subscribed: subs.length > 0,
    count: subs.length,
  }
}

export async function sendTestPushNotificationAction(): Promise<{
  success: boolean
  sent: number
  failed: number
}> {
  const userId = await requireUserId()
  if (!userId) return { success: false, sent: 0, failed: 0 }

  const result = await sendUserPushNotification(userId, {
    title: 'Uji Coba Notifikasi KasDesk',
    body: 'Notifikasi Web Push aktif! Anda akan menerima pengingat tagihan dan catat malam.',
    url: '/?action=quicklog',
    tag: 'test-push',
  })

  return {
    success: result.sent > 0,
    sent: result.sent,
    failed: result.failed,
  }
}
