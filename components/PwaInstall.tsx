'use client'

import { useEffect, useState } from 'react'
import { Download, Share2, CheckCircle2, MonitorSmartphone } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function PwaInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setInstalled(isStandalone())
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
      if (typeof window !== 'undefined' && (window as unknown as { __deferredPwaPrompt?: InstallPromptEvent }).__deferredPwaPrompt) {
        setPrompt((window as unknown as { __deferredPwaPrompt: InstallPromptEvent }).__deferredPwaPrompt)
      }
    })

    const onPrompt = (event: Event) => {
      event.preventDefault()
      ;(window as unknown as { __deferredPwaPrompt?: InstallPromptEvent }).__deferredPwaPrompt = event as InstallPromptEvent
      setPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPrompt(null)
      ;(window as unknown as { __deferredPwaPrompt?: null }).__deferredPwaPrompt = null
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
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setPrompt(null)
    ;(window as unknown as { __deferredPwaPrompt?: null }).__deferredPwaPrompt = null
  }

  if (installed) {
    return (
      <div className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-accent-income/30 bg-accent-income/10 px-4 text-sm font-medium text-accent-income">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        KASDESK sudah terpasang
      </div>
    )
  }

  if (prompt) {
    return (
      <button type="button" onClick={install} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-solid px-5 font-semibold text-white transition hover:brightness-110 active:scale-[.99]">
        <Download className="h-5 w-5" aria-hidden />
        Instal aplikasi
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-border-outer bg-white/[0.025] p-5 text-sm text-text-secondary">
      <div className="mb-3 flex items-center gap-2.5 font-semibold text-text-primary">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/10 text-accent">
          {ios ? <Share2 className="h-4 w-4" aria-hidden /> : <MonitorSmartphone className="h-4 w-4" aria-hidden />}
        </span>
        {ios ? 'Petunjuk Pasang di iPhone / iPad' : 'Petunjuk Pasang di Browser'}
      </div>
      {ios ? (
        <ol className="space-y-2 text-xs leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">1</span>
            <span>Buka situs ini di browser <b className="text-text-primary">Safari</b>.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">2</span>
            <span>Tekan tombol <b className="text-text-primary">Bagikan (Share)</b> di menu bar bawah.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">3</span>
            <span>Gulir ke bawah dan pilih <b className="text-text-primary">Tambahkan ke Layar Utama</b>.</span>
          </li>
        </ol>
      ) : (
        <ol className="space-y-2 text-xs leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">1</span>
            <span>Buka menu titik tiga <b className="text-text-primary">(⋮)</b> di pojok browser (Chrome / Edge).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">2</span>
            <span>Pilih menu <b className="text-text-primary">Instal aplikasi</b> atau <b className="text-text-primary">Tambahkan ke layar utama</b>.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">3</span>
            <span>Tekan <b className="text-text-primary">Instal</b> untuk konfirmasi. Ikon KASDESK akan muncul di layar utama!</span>
          </li>
        </ol>
      )}
    </div>
  )
}
