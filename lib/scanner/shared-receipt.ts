
export interface SharedReceiptItem {
  id: string
  blob: Blob
  name: string
  type: string
  createdAt: number
}

const DB_NAME = 'kasdesk-shared-receipts'
const DB_VERSION = 1
const STORE_NAME = 'receipts'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'))
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function storeSharedReceipt(file: Blob, name = 'shared-receipt.jpg'): Promise<string> {
  const db = await openDb()
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  const item: SharedReceiptItem = {
    id,
    blob: file,
    name,
    type: file.type || 'image/jpeg',
    createdAt: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(item)
    tx.oncomplete = () => { db.close(); resolve(id) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function getLatestSharedReceipt(): Promise<SharedReceiptItem | null> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).getAll()
      req.onsuccess = () => {
        db.close()
        const items = req.result as SharedReceiptItem[]
        if (!items || items.length === 0) return resolve(null)
        items.sort((a, b) => b.createdAt - a.createdAt)
        resolve(items[0])
      }
      req.onerror = () => { db.close(); reject(req.error) }
    })
  } catch {
    return null
  }
}

export async function clearSharedReceipt(id: string): Promise<void> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(id)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  } catch {}
}
