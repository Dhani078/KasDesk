'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, Send } from 'lucide-react'
import {
  getVapidPublicKeyAction,
  savePushSubscriptionAction,
  removePushSubscriptionAction,
  sendTestPushNotificationAction,
} from '@/lib/push/actions'
import { hapticSuccess, hapticTap, hapticWarning } from '@/lib/haptics'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function PushNotificationToggle() {
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return false
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
  })
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (supported && Notification.permission === 'granted') {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          setEnabled(!!sub)
        })
        .catch(() => {})
    }
  }, [supported])

  const handleToggle = async () => {
    if (!supported || loading) return
    hapticTap()
    setLoading(true)
    setStatusMsg(null)

    try {
      const reg = await navigator.serviceWorker.ready
      const currentSub = await reg.pushManager.getSubscription()

      if (enabled && currentSub) {
        // Unsubscribe
        await currentSub.unsubscribe()
        await removePushSubscriptionAction(currentSub.endpoint)
        setEnabled(false)
        setStatusMsg('Notifikasi berhasil dimatikan')
      } else {
        // Request permission and subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          hapticWarning()
          setStatusMsg('Izin notifikasi ditolak oleh browser')
          setLoading(false)
          return
        }

        const vapidPublicKey = await getVapidPublicKeyAction()
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey)

        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        })

        const p256dhKey = newSub.getKey('p256dh')
        const authKey = newSub.getKey('auth')

        const res = await savePushSubscriptionAction({
          endpoint: newSub.endpoint,
          p256dh: arrayBufferToBase64Url(p256dhKey),
          auth: arrayBufferToBase64Url(authKey),
          userAgent: navigator.userAgent,
        })

        if (res.success) {
          hapticSuccess()
          setEnabled(true)
          setStatusMsg('Notifikasi Web Push berhasil diaktifkan')
        } else {
          hapticWarning()
          setStatusMsg(res.error || 'Gagal menyimpan langganan')
        }
      }
    } catch (err) {
      console.error('[PushToggle Error]', err)
      hapticWarning()
      setStatusMsg('Terjadi kesalahan saat mengatur notifikasi')
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async () => {
    if (testSending) return
    hapticTap()
    setTestSending(true)
    setStatusMsg(null)

    try {
      const res = await sendTestPushNotificationAction()
      if (res.success) {
        hapticSuccess()
        setStatusMsg('Uji coba notifikasi terkirim!')
      } else {
        hapticWarning()
        setStatusMsg('Gagal mengirim uji coba notifikasi')
      }
    } catch {
      setStatusMsg('Terjadi kesalahan pengiriman')
    } finally {
      setTestSending(false)
    }
  }

  if (!supported) {
    return (
      <div className="flex items-center gap-3 p-4 text-xs text-text-secondary">
        <BellOff className="h-4 w-4 shrink-0 text-text-secondary" />
        <span>Perangkat atau browser ini tidak mendukung Web Push Notifications.</span>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="icon-tile mt-0.5">
            {enabled ? (
              <Bell className="h-5 w-5 text-accent" aria-hidden />
            ) : (
              <BellOff className="h-5 w-5 text-text-secondary" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">
              Notifikasi Web Push
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
              Pengingat tagihan H-3, pengingat catat malam 20:00, dan peringatan budget 90%.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          aria-label={enabled ? 'Matikan notifikasi push' : 'Aktifkan notifikasi push'}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-accent' : 'bg-surface-elevated'
          } ${loading ? 'opacity-50' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            } mt-0.5`}
          />
        </button>
      </div>

      {enabled && (
        <div className="pt-2 flex items-center justify-between border-t border-border-inner text-xs">
          <span className="text-accent font-medium flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Aktif di perangkat ini
          </span>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={testSending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-accent/25 bg-accent/10 px-3 py-1.5 font-medium text-accent hover:bg-accent/20 active:scale-95 transition"
          >
            {testSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Uji Notifikasi
          </button>
        </div>
      )}

      {statusMsg && (
        <p className="text-[11px] text-text-secondary animate-fade-in pt-1">
          {statusMsg}
        </p>
      )}
    </div>
  )
}
