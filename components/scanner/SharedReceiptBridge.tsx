'use client'

import { useEffect, useRef } from 'react'
import { getLatestSharedReceipt, clearSharedReceipt } from '@/lib/scanner/shared-receipt'

/**
 * Client bridge for Web Share Target (EPIC 8.1).
 * Detects incoming receipts from Service Worker IndexedDB or server fallback
 * and forwards them to the ScanReceipt pipeline via `kasdesk:scan-file`.
 */
export function SharedReceiptBridge() {
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    if (typeof window === 'undefined') return

    const checkSharedReceipt = async () => {
      const params = new URLSearchParams(window.location.search)
      const hasSharedParam = params.get('shared') === '1'

      // 1. Check server fallback sessionStorage
      try {
        const dataUri = sessionStorage.getItem('kasdesk:shared-receipt-data')
        const fileName = sessionStorage.getItem('kasdesk:shared-receipt-name') || 'shared-receipt.jpg'

        if (dataUri) {
          handledRef.current = true
          sessionStorage.removeItem('kasdesk:shared-receipt-data')
          sessionStorage.removeItem('kasdesk:shared-receipt-name')

          const res = await fetch(dataUri)
          const blob = await res.blob()
          const file = new File([blob], fileName, { type: blob.type })

          cleanUrlParam()
          dispatchScanFile(file)
          return
        }
      } catch (err) {
        console.error('[SharedReceiptBridge SessionStorage Error]', err)
      }

      // 2. Check Service Worker IndexedDB
      if (hasSharedParam) {
        try {
          const item = await getLatestSharedReceipt()
          if (item) {
            handledRef.current = true
            await clearSharedReceipt(item.id)
            const file = new File([item.blob], item.name, { type: item.type })

            cleanUrlParam()
            dispatchScanFile(file)
            return
          }
        } catch (err) {
          console.error('[SharedReceiptBridge IDB Error]', err)
        }
      }
    }

    const cleanUrlParam = () => {
      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('shared')
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''))
      } catch {}
    }

    const dispatchScanFile = (file: File) => {
      // Small timeout to allow target components to mount and listen
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('kasdesk:scan-file', { detail: file }))
      }, 150)
    }

    checkSharedReceipt()
  }, [])

  return null
}
