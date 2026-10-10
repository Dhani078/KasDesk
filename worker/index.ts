/**
 * Custom Service Worker Extension for KasDesk PWA.
 *
 * Implements:
 * 1. Web Share Target (EPIC 8.1): Intercepts POST /share-target, saves shared receipts
 *    to IndexedDB, and redirects client to /?action=scan&shared=1.
 * 2. Web Push Notifications (EPIC 8.4): Listens to push events, displays native notifications,
 *    and handles notificationclick deep linking.
 */

// Use untyped handle for ServiceWorker scope inside standard DOM tsconfig
const sw = (typeof self !== 'undefined' ? self : globalThis) as any

const DB_NAME = 'kasdesk-shared-receipts'
const DB_VERSION = 1
const STORE_NAME = 'receipts'

function saveSharedFileToIdb(file: Blob, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!sw.indexedDB) return resolve()
    const req = sw.indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
      tx.objectStore(STORE_NAME).put({
        id,
        blob: file,
        name,
        type: file.type || 'image/jpeg',
        createdAt: Date.now(),
      })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
    req.onerror = () => reject(req.error)
  })
}

// ────────────────────────────────────────────────────────── 1. Web Share Target
sw.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData()
          const file = formData.get('receipt') as File | null
          if (file && file.size > 0) {
            await saveSharedFileToIdb(file, file.name || 'shared-receipt.jpg')
            return Response.redirect('/?action=scan&shared=1', 303)
          }
        } catch (err) {
          console.error('[SW Share Target Error]', err)
        }
        return Response.redirect('/?action=scan', 303)
      })()
    )
  }
})

// ────────────────────────────────────────────────────────── 2. Web Push
sw.addEventListener('push', (event: any) => {
  if (!event.data) return

  let payload = {
    title: 'KasDesk Finansial',
    body: 'Ada pembaruan penting di keuanganmu.',
    url: '/?action=quicklog',
    tag: 'kasdesk-alert',
  }

  try {
    const data = event.data.json()
    payload = { ...payload, ...data }
  } catch {
    payload.body = event.data.text()
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: payload.tag,
    data: { url: payload.url },
  }

  event.waitUntil(sw.registration.showNotification(payload.title, options))
})

// ────────────────────────────────────────────────────── 3. Notification Click
sw.addEventListener('notificationclick', (event: any) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/?action=quicklog'

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: any[]) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(sw.location.origin)) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
      }
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(targetUrl)
      }
    })
  )
})
