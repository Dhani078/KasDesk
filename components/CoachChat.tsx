'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Sparkles, Send, Trash2, Bot, User, Check, Copy, ArrowRight, RefreshCw, Cpu } from 'lucide-react'
import { AI_MODELS, type AiModel } from '@/lib/types'

type Message = {
  id: string
  role: 'user' | 'model'
  text: string
  model?: string
  timestamp: string
}

type Props = {
  initialContext?: {
    totalBalance: number
    safeDailySpend: number
    monthlyExpense: number
    monthlyIncome: number
    topCategory?: string
    healthScore: number
  }
}

const QUICK_PROMPTS = [
  'Bagaimana kondisi keuanganku bulan ini?',
  'Berapa batas belanja harian yang aman?',
  'Tips kurangi pengeluaran kategori terbesar?',
  'Strategi tabung dana darurat vs bayar utang?',
]

const MODEL_LABELS: Record<AiModel, { name: string; tag: string }> = {
  'gemini-3.8-flash': { name: 'Gemini 3.8 Flash', tag: 'Terbaru' },
  'gemini-3.7-flash': { name: 'Gemini 3.7 Flash', tag: 'Cepat' },
  'gemini-3.6-flash': { name: 'Gemini 3.6 Flash', tag: 'Stabil' },
}

function renderFormattedText(text: string) {
  // Lightweight native markdown renderer (bold, lists, paragraphs)
  const paragraphs = text.split(/\n\n+/)

  return paragraphs.map((para, pIdx) => {
    const lines = para.split('\n')
    const isBulletList = lines.every((line) => line.trim().startsWith('* ') || line.trim().startsWith('- '))

    if (isBulletList) {
      return (
        <ul key={pIdx} className="my-2 list-disc pl-5 space-y-1">
          {lines.map((line, lIdx) => {
            const clean = line.replace(/^[\*\-]\s+/, '')
            return <li key={lIdx}>{formatInline(clean)}</li>
          })}
        </ul>
      )
    }

    return (
      <p key={pIdx} className="my-1.5 leading-relaxed">
        {lines.map((line, lIdx) => (
          <span key={lIdx}>
            {formatInline(line)}
            {lIdx < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    )
  })
}

function formatInline(str: string) {
  // Parses **bold** and *italic*
  const parts = str.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

let msgSeq = 0
function getMsgId(prefix: string) {
  return `${prefix}-${++msgSeq}`
}

function getNowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function CoachChat({ initialContext }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Halo! Saya KasDesk AI Coach. Saya memantau saldo, arus kas, dan budget harianmu. Tanyakan apa saja seputar perencanaan finansial atau pilih topik di bawah.',
      model: 'gemini-3.8-flash',
      timestamp: 'Baru saja',
    },
  ])
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<AiModel>('gemini-3.8-flash')
  const [isPending, startTransition] = useTransition()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleCoachPrompt = (e: Event) => {
      const custom = e as CustomEvent<{ prompt?: string }>
      if (custom.detail?.prompt) {
        setInput(custom.detail.prompt)
        inputRef.current?.focus()
      }
    }
    window.addEventListener('kasdesk:coach-prompt', handleCoachPrompt)
    return () => window.removeEventListener('kasdesk:coach-prompt', handleCoachPrompt)
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  function handleCopy(id: string, text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => {})
  }

  function handleClear() {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        text: 'Percakapan telah direset. Mau diskusi atau analisis apa sekarang?',
        model: selectedModel,
        timestamp: 'Baru saja',
      },
    ])
  }

  async function handleSend(textToSend?: string) {
    const query = (textToSend ?? input).trim()
    if (!query || isPending) return

    const userMsg: Message = {
      id: getMsgId('u'),
      role: 'user',
      text: query,
      timestamp: getNowTime(),
    }

    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setInput('')

    startTransition(async () => {
      try {
        const historyForApi = nextHistory
          .filter((m) => m.id !== 'welcome' && m.id !== 'welcome-reset')
          .slice(-6)
          .map((m) => ({ role: m.role, text: m.text }))

        const res = await fetch('/api/coach/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            model: selectedModel,
            history: historyForApi.slice(0, -1),
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          setMessages((prev) => [
            ...prev,
            {
              id: getMsgId('err'),
              role: 'model',
              text: errData.message || 'Maaf, terjadi gangguan saat menghubungi asisten AI. Silakan coba lagi.',
              timestamp: getNowTime(),
            },
          ])
          return
        }

        const data = await res.json()
        const botMsg: Message = {
          id: getMsgId('b'),
          role: 'model',
          text: data.reply,
          model: data.model,
          timestamp: getNowTime(),
        }

        setMessages((prev) => [...prev, botMsg])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: getMsgId('err'),
            role: 'model',
            text: 'Koneksi terputus. Pastikan internet terhubung dan coba lagi.',
            timestamp: getNowTime(),
          },
        ])
      }
    })
  }

  return (
    <section className="surface-card overflow-hidden rounded-3xl border border-border-outer shadow-xl flex flex-col mb-8">
      {/* Top Header & Model Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-inner bg-surface/50 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <span className="icon-tile !h-9 !w-9 text-accent">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              Konsultasi AI Coach
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider">
                Live
              </span>
            </h2>
            <p className="text-xs text-text-secondary">Didukung model Gemini Flash terbaru</p>
          </div>
        </div>

        {/* Model Picker Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-canvas rounded-xl p-1 border border-border-inner text-xs">
            <Cpu className="h-3.5 w-3.5 text-text-secondary ml-1.5 mr-0.5" aria-hidden />
            {AI_MODELS.map((m) => {
              const active = selectedModel === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedModel(m)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? 'bg-accent-solid text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                  aria-pressed={active}
                >
                  {m.replace('gemini-', 'G-').replace('-flash', '')}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="icon-button !h-8 !w-8 text-text-secondary hover:text-danger"
            title="Hapus riwayat obrolan"
            aria-label="Hapus riwayat obrolan"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Financial Snapshot Summary Bar */}
      {initialContext && (
        <div className="bg-canvas/50 px-4 py-2 border-b border-border-inner text-[11px] text-text-secondary flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Skor: <strong className="text-text-primary">{initialContext.healthScore}/100</strong></span>
          <span>Aman/Hari: <strong className="text-accent">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(initialContext.safeDailySpend)}</strong></span>
          {initialContext.topCategory && (
            <span>Top: <strong className="text-text-primary">{initialContext.topCategory}</strong></span>
          )}
          <span className="ml-auto text-[10px] text-text-secondary/70 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-income inline-block" />
            Konteks Sinkron
          </span>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 max-h-[460px] overflow-y-auto p-4 sm:p-5 space-y-4 text-sm">
        {messages.map((m) => {
          const isUser = m.role === 'user'
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[92%] sm:max-w-[85%] ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs ${
                  isUser
                    ? 'bg-accent/20 text-accent font-semibold'
                    : 'bg-white/[0.06] text-text-secondary border border-border-inner'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className="flex flex-col group min-w-0">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm break-words shadow-sm ${
                    isUser
                      ? 'bg-accent-solid text-white font-medium rounded-tr-sm'
                      : 'surface-card text-text-primary border border-border-outer rounded-tl-sm'
                  }`}
                >
                  {isUser ? m.text : renderFormattedText(m.text)}
                </div>

                <div
                  className={`flex items-center gap-2 mt-1 px-1 text-[11px] text-text-secondary ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span>{m.timestamp}</span>
                  {m.model && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-[10px] text-accent">
                        {MODEL_LABELS[m.model as AiModel]?.name ?? m.model}
                      </span>
                    </>
                  )}
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopy(m.id, m.text)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-text-secondary hover:text-text-primary"
                      title="Salin jawaban"
                      aria-label="Salin jawaban"
                    >
                      {copiedId === m.id ? (
                        <Check className="h-3 w-3 text-accent-income" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {isPending && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center animate-pulse">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-accent border border-border-inner">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div className="surface-card rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-text-secondary border border-border-outer flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent" />
              Menghitung analisis finansial...
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="border-t border-border-inner bg-surface/30 px-4 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-2">
        <span className="text-[11px] font-semibold text-text-secondary whitespace-nowrap">
          Saran tanya:
        </span>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isPending}
            onClick={() => handleSend(prompt)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-outer bg-canvas/70 px-3 py-1 text-xs text-text-secondary transition hover:border-accent/40 hover:text-text-primary hover:bg-canvas active:scale-95 disabled:opacity-50"
          >
            {prompt}
            <ArrowRight className="h-2.5 w-2.5 text-accent" />
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="border-t border-border-outer bg-surface p-3 sm:p-4 flex items-center gap-2.5"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Tanya AI Coach (${MODEL_LABELS[selectedModel]?.name})...`}
          disabled={isPending}
          className="flex-1 min-w-0 rounded-xl border border-border-outer bg-canvas px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition disabled:opacity-50"
          aria-label="Pesan konsultasi keuangan"
        />

        <button
          type="submit"
          disabled={!input.trim() || isPending}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-solid text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Kirim pesan"
        >
          {isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </section>
  )
}
