'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Sparkles, Bot, User, Send, X, Trash2, RefreshCw } from 'lucide-react'
import { type AiModel } from '@/lib/types'
import { TransactionActionCard } from '@/components/coach/TransactionActionCard'

interface FloatingMessage {
  id: string
  role: 'user' | 'model'
  text: string
  action?: {
    type: 'transaction_draft'
    data: {
      type: 'expense' | 'income'
      amount: number
      categoryTag: string
      notes: string
    }
  }
}

export function FloatingCoachBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<FloatingMessage[]>([
    {
      id: 'init',
      role: 'model',
      text: 'Halo! Saya KasDesk AI Coach. Tanya apa saja seputar keuanganmu atau ketik langsung seperti *"makan 18rb"* untuk catat cepat.',
    },
  ])
  const [input, setInput] = useState('')
  const [selectedModel] = useState<AiModel>('gemini-3.8-flash')
  const [wallets, setWallets] = useState<{ id: string; name: string; balance?: number }[]>([])
  const [isPending, startTransition] = useTransition()
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch wallets once when bubble is first opened so user can confirm transaction draft
  useEffect(() => {
    if (isOpen && wallets.length === 0) {
      fetch('/api/export')
        .then((r) => r.json())
        .then((d) => {
          if (d.wallets && Array.isArray(d.wallets)) {
            setWallets(
              d.wallets.map((w: { id: string; name: string; balance?: number }) => ({
                id: w.id,
                name: w.name,
                balance: Number(w.balance || 0),
              })),
            )
          }
        })
        .catch(() => {})
    }
  }, [isOpen, wallets.length])

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [isOpen, messages, isPending])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const handleSend = () => {
    const clean = input.trim()
    if (!clean || isPending) return

    const userMsg: FloatingMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: clean,
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')

    startTransition(async () => {
      try {
        const historyPayload = nextMessages
          .filter((m) => m.id !== 'init')
          .slice(-6)
          .map((m) => ({ role: m.role, text: m.text }))

        const res = await fetch('/api/coach/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: clean,
            model: selectedModel,
            history: historyPayload.slice(0, -1),
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'model',
              text: err.message || 'Maaf, server AI sedang antre. Silakan ulangi sesaat lagi.',
            },
          ])
          return
        }

        const data = await res.json()
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            role: 'model',
            text: data.reply,
            action: data.action,
          },
        ])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'model',
            text: 'Koneksi terputus. Pastikan koneksi internet terhubung.',
          },
        ])
      }
    })
  }

  return (
    <>
      {/* Floating Action Bubble (Bottom-Right) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Tanya AI Coach KasDesk"
          aria-label="Buka Chat AI Coach"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2.5 rounded-full bg-surface/90 backdrop-blur-xl border border-accent/40 p-2.5 pr-4 text-text-primary shadow-[0_8px_32px_rgba(79,127,232,0.35)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 hover:border-accent hover:shadow-[0_12px_40px_rgba(56,189,248,0.5)] active:scale-95 cursor-pointer group animate-float-smooth animate-pulse-glow"
        >
          {/* Glowing Animated AI Core Orb */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-accent to-sky-400 p-0.5 shadow-md">
            <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping opacity-50" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-canvas/40 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-white transition-transform duration-500 group-hover:rotate-45" />
            </div>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold tracking-wide text-text-primary group-hover:text-accent transition-colors">
              AI Coach
            </span>
            <span className="hidden sm:inline text-[9px] text-text-secondary leading-none">
              Tanya / Catat Cepat
            </span>
          </div>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[410px] h-[530px] max-h-[82vh] flex flex-col surface-card rounded-3xl border border-border-outer shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden backdrop-blur-2xl animate-fade-in-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-inner bg-surface/80 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-accent to-sky-400 shadow-sm text-white">
                <Bot className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent-income ring-2 ring-canvas" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <span>KasDesk AI Coach</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/15 text-accent font-semibold">
                    v2.5
                  </span>
                </h3>
                <p className="text-[10px] text-text-secondary">Asisten Finansial &amp; Catat Percakapan</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: 'init',
                      role: 'model',
                      text: 'Halo! Ada pengeluaran baru yang ingin dicatat cepat atau dievaluasi?',
                    },
                  ])
                }
                title="Bersihkan obrolan"
                className="rounded-lg p-1 text-text-secondary hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup obrolan"
                className="rounded-lg p-1 text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick chip suggestions */}
          <div className="bg-canvas/50 border-b border-border-inner/50 px-3 py-1.5 flex gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
            {['Makan siang 25k', 'Beli bensin 20k', 'Kondisi keuanganku?', 'Batas belanja aman?'].map((txt) => (
              <button
                key={txt}
                type="button"
                onClick={() => {
                  setInput(txt)
                  inputRef.current?.focus()
                }}
                className="shrink-0 rounded-full border border-border-outer bg-white/[0.03] px-2.5 py-0.5 text-text-secondary hover:text-accent hover:border-accent/40 transition"
              >
                {txt}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
            {messages.map((m) => {
              const isUser = m.role === 'user'
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 max-w-[90%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px] ${
                      isUser
                        ? 'bg-accent/20 text-accent font-semibold'
                        : 'bg-white/[0.06] text-text-secondary border border-border-inner'
                    }`}
                  >
                    {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div
                      className={`rounded-2xl px-3 py-2 text-xs break-words shadow-sm leading-relaxed ${
                        isUser
                          ? 'bg-accent-solid text-white font-medium rounded-tr-sm'
                          : 'surface-card text-text-primary border border-border-outer rounded-tl-sm whitespace-pre-wrap'
                      }`}
                    >
                      {m.text}
                    </div>

                    {!isUser && m.action?.type === 'transaction_draft' && m.action.data && (
                      <TransactionActionCard draft={m.action.data} wallets={wallets} />
                    )}
                  </div>
                </div>
              )
            })}

            {isPending && (
              <div className="flex items-center gap-2 text-[11px] text-text-secondary italic pl-8">
                <RefreshCw className="h-3 w-3 animate-spin text-accent" />
                <span>AI sedang berpikir...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Box */}
          <div className="border-t border-border-inner bg-surface/50 p-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Tulis pesan (cth: makan soto 18000)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isPending}
                className="flex-1 rounded-xl border border-border-outer bg-canvas px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={isPending || !input.trim()}
                className="grid h-8 w-8 place-items-center rounded-xl bg-accent-solid text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
