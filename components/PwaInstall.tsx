'use client'

import { useEffect, useState } from 'react'
import { Download, Share2, CheckCircle2, MonitorSmartphone } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setInstalled(isStandalone())
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    })
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPromptEvent)
      setMessage('')
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
      setMessage('KASDESK berhasil dipasang.')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!prompt || busy) return
    setBusy(true)
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      else setMessage('Instalasi dibatalkan. Kamu dapat mencoba lagi dari menu browser.')
      setPrompt(null)
    } catch {
      setMessage('Instalasi tidak dapat dibuka. Gunakan menu browser.')
    } finally {
      setBusy(false)
    }
  }

  if (installed) {
    return <div role="status" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-accent-income/30 bg-accent-income/10 px-4 text-sm font-medium text-accent-income"><CheckCircle2 className="h-4 w-4" aria-hidden />KASDESK sudah terpasang</div>
  }

  if (prompt) {
    return <div><button type="button" onClick={install} disabled={busy} aria-describedby="pwa-install-status" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-solid px-5 font-semibold text-white transition hover:brightness-110 active:scale-[.99] disabled:cursor-wait disabled:opacity-70"><Download className="h-5 w-5" aria-hidden />{busy ? 'Membuka instalasi…' : 'Instal aplikasi'}</button><p id="pwa-install-status" aria-live="polite" className="mt-2 min-h-5 text-center text-xs text-text-secondary">{message}</p></div>
  }

  return <div role="status" aria-live="polite" className="rounded-xl border border-border-outer bg-white/[0.025] p-4 text-sm text-text-secondary"><div className="mb-2 flex items-center gap-2 font-medium text-text-primary">{ios ? <Share2 className="h-4 w-4 text-accent" aria-hidden /> : <MonitorSmartphone className="h-4 w-4 text-accent" aria-hidden />}{ios ? 'Pasang di iPhone atau iPad' : 'Pasang dari browser'}</div>{ios ? <p>Di Safari, tekan <b className="text-text-primary">Bagikan</b>, lalu pilih <b className="text-text-primary">Tambahkan ke Layar Utama</b>.</p> : <p>Buka menu browser dan pilih <b className="text-text-primary">Instal aplikasi</b> atau <b className="text-text-primary">Tambahkan ke layar utama</b>.</p>}{message && <p className="mt-2">{message}</p>}</div>
}
