import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserId } from '@/lib/auth/session'
import { checkDistributedRateLimit } from '@/lib/auth/distributed-rate-limit'
import { getDashboardSummary } from '@/lib/analytics/actions'
import { getTopCategories } from '@/lib/actions'
import { formatIDR } from '@/lib/format'
import { AI_MODELS, type AiModel } from '@/lib/types'
import { parseCoachMessageNlp } from '@/lib/coach/nlp-parser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Pesan tidak boleh kosong').max(1000, 'Pesan maksimal 1000 karakter'),
  model: z.enum(AI_MODELS).optional().default('gemini-3.8-flash'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string().max(2000),
      })
    )
    .max(10)
    .optional()
    .default([]),
})

function generateFallbackAdvice(
  dash: Awaited<ReturnType<typeof getDashboardSummary>>,
  top: { category: string; amount: number }[],
  query: string
): string {
  const nlp = parseCoachMessageNlp(query)
  if (nlp.isTransactionIntent && nlp.transactionDraft) {
    const draft = nlp.transactionDraft
    return `Siap! Saya mendeteksi ${draft.type === 'expense' ? 'pengeluaran' : 'pemasukan'} sebesar **${formatIDR(draft.amount)}** untuk **${draft.notes}** (Kategori #${draft.categoryTag}).\n\nSilakan konfirmasi pada kartu di bawah ini untuk langsung menyimpannya ke dompet KasDesk Anda.`
  }

  const q = query.toLowerCase()
  const topCat = top[0]?.category || 'Umum'
  const topAmt = top[0]?.amount ? formatIDR(top[0].amount) : 'Rp 0'

  if (q.includes('kondisi') || q.includes('skor') || q.includes('kesehatan') || q.includes('bagaimana')) {
    return `Berdasarkan data keuanganmu di KasDesk saat ini:\n\n* **Total Saldo:** ${formatIDR(dash.totalBalance)}\n* **Skor Kesehatan Finansial:** ${dash.healthScore}/100 (${dash.healthScore >= 85 ? 'Sangat Sehat 💎' : dash.healthScore >= 70 ? 'Baik 🥇' : 'Perlu Perhatian 🥈'})\n* **Aman Belanja Harian:** ${formatIDR(dash.safeDailySpend)}/hari (${dash.daysLeft} hari tersisa bulan ini)\n* **Pengeluaran Terbesar:** Kategori ${topCat} (${topAmt})\n\nSaran praktis: Jaga pengeluaran harian tidak melebihi ${formatIDR(dash.safeDailySpend)} agar target tabungan tetap aman.`
  }

  if (q.includes('aman') || q.includes('harian') || q.includes('belanja') || q.includes('batas')) {
    return `Batas belanja aman harianmu adalah **${formatIDR(dash.safeDailySpend)}/hari**.\n\nAngka ini dihitung otomatis dari total uang cair dikurangi alokasi tabungan target (${formatIDR(dash.vaultAllocations)}) dan kewajiban jatuh tempo (${formatIDR(dash.upcomingDebts)}), dibagi sisa ${dash.daysLeft} hari bulan ini.`
  }

  if (q.includes('hemat') || q.includes('kategori') || q.includes('kurangi')) {
    return `Kategori pengeluaran terbesarmu bulan ini adalah **${topCat}** sebesar **${topAmt}**.\n\nLangkah hemat yang direkomendasikan:\n* Pasang batas budget untuk ${topCat} di menu Budget & Planning.\n* Evaluasi transaksi 7 hari terakhir dan kurangi pos yang bukan kebutuhan utama.`
  }

  if (q.includes('utang') || q.includes('tabung') || q.includes('prioritas') || q.includes('vault')) {
    if (dash.upcomingDebts > 0) {
      return `Prioritas utama yang disarankan: **Lunasi kewajiban utang berjalan (${formatIDR(dash.upcomingDebts)}) terlebih dahulu** sebelum menambah alokasi tabungan baru, agar tidak terkena denda atau beban bunga.`
    }
    return `Kondisi kewajiban utangmu aman (Rp 0). Kamu bisa fokus mengalokasikan surplus bulanan ke **Brankas & Target (Vaults)** untuk membangun dana darurat 3-6 bulan pengeluaran.`
  }

  return `Halo! Berdasarkan ringkasan KasDesk, saldo aktifmu adalah **${formatIDR(dash.totalBalance)}** dengan batas aman belanja **${formatIDR(dash.safeDailySpend)}/hari**. Pengeluaran terbesar bulan ini berada di kategori **${topCat}** (${topAmt}). Tetap catat setiap pengeluaran agar kondisi finansialmu selalu terpantau!`
}

function buildSystemPrompt(
  dash: Awaited<ReturnType<typeof getDashboardSummary>>,
  topCategories: { category: string; amount: number }[]
): string {
  const topList = topCategories.length
    ? topCategories.map((c) => `${c.category}: ${formatIDR(c.amount)}`).join(', ')
    : 'Belum ada data pengeluaran'

  return `Kamu adalah KasDesk AI Coach, asisten keuangan pribadi yang cerdas, praktis, dan ramah khusus untuk aplikasi KasDesk.
Tugasmu adalah menganalisis kondisi keuangan pengguna dan memberikan saran yang to-the-point, realistis, dan mudah dieksekusi.

PENTING - BATASAN TOPIK (GUARDRAIL):
- Kamu HANYA melayani topik manajemen keuangan pribadi, pencatatan transaksi, dompet, budget, tabungan (vaults), utang-piutang, pajak freelancer, dan fitur KasDesk.
- JANGAN PERNAH membuat kode program (Python, JS, HTML, script bot, dsb) atau membahas coding/programming teknis. Jika pengguna meminta coding atau topik di luar keuangan, tolak secara santun dan kembalikan percakapan ke manajemen keuangan KasDesk.
- Jika pengguna memberitahukan pengeluaran atau pemasukan (misal: "saya makan hari ini 18000" atau "beli bensin 25k"), tanggapi dengan konfirmasi ramah bahwa transaksi siap dicatat dan berikan catatan singkat apakah pengeluaran tersebut wajar terhadap batas belanja aman harian (${formatIDR(dash.safeDailySpend)}/hari).

Berikut ringkasan data finansial terkini pengguna:
- Total Saldo Semua Dompet: ${formatIDR(dash.totalBalance)}
- Pemasukan Bulan Ini: ${formatIDR(dash.monthlyIncome)}
- Pengeluaran Bulan Ini: ${formatIDR(dash.monthlyExpense)}
- Batas Belanja Aman Harian (Safe Daily Spend): ${formatIDR(dash.safeDailySpend)}/hari (${dash.daysLeft} hari tersisa bulan ini)
- Alokasi Tabungan/Target (Vaults): ${formatIDR(dash.vaultAllocations)}
- Kewajiban/Utang Berjalan: ${formatIDR(dash.upcomingDebts)}
- Skor Kesehatan Finansial: ${dash.healthScore}/100
- Kategori Pengeluaran Terbesar: ${topList}

Panduan respons:
1. Jawab dalam Bahasa Indonesia yang santun, bersahabat, dan jelas.
2. Gunakan format Rupiah (${formatIDR(100000)}) untuk setiap angka uang.
3. Berikan saran terarah (maksimal 2-3 poin tindakan konkret jika diperlukan).
4. Jangan bertele-tele, hindari jargon keuangan rumit.`
}

export async function POST(req: Request) {
  // 1. Auth check
  const userId = await requireUserId()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  // 2. Distributed rate limit: 30 requests per minute per user
  const rl = await checkDistributedRateLimit('coach-chat', userId, 30, 60)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retry_after: rl.retryAfterSec },
      { status: 429 }
    )
  }

  // 3. API Key check
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI_NOT_CONFIGURED', message: 'Layanan AI belum dikonfigurasi.' },
      { status: 503 }
    )
  }

  // 4. Input validation
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Input tidak valid' },
      { status: 400 }
    )
  }

  const { message, model: chosenModel, history } = parsed.data

  // 4b. Guardrail check & transaction intent parsing
  const nlp = parseCoachMessageNlp(message)
  if (nlp.isOffTopicCoding) {
    return NextResponse.json({
      reply: 'Maaf, saya adalah asisten finansial khusus aplikasi KasDesk. Saya tidak dapat membuat kode program atau menangani tugas pemrograman teknis.\n\nNamun, saya siap membantu Anda menganalisis saldo, mencatat transaksi cepat, mengecek batas belanja aman, mengestimasi pajak freelancer, atau menyusun strategi tabungan di KasDesk. Ada yang ingin dihitung atau dievaluasi dari keuangan Anda?',
      model: chosenModel,
      requestedModel: chosenModel,
      usedFallback: false,
      isOffTopic: true,
    })
  }

  // 5. Gather real financial context
  const [dash, top] = await Promise.all([getDashboardSummary(), getTopCategories(5)])
  const systemPrompt = buildSystemPrompt(dash, top)

  // 6. Build contents payload with system context inlined for maximum compatibility across Gemini 3.x Flash models
  const initialUserPrompt = `[PANDUAN & KONTEKS SISTEM]\n${systemPrompt}\n\n[PESAN PENGGUNA]\n${message}`

  const contents = history.length === 0
    ? [
        {
          role: 'user',
          parts: [{ text: initialUserPrompt }],
        },
      ]
    : [
        {
          role: 'user',
          parts: [{ text: `[PANDUAN & KONTEKS SISTEM]\n${systemPrompt}\n\n[AWAL PERCAKAPAN]` }],
        },
        ...history.map((h) => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }],
        })),
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ]

  const payloadBody = JSON.stringify({
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  })

  // Priority cascade: selected model first, then the remaining modern models
  const modelQueue: AiModel[] = [
    chosenModel,
    ...AI_MODELS.filter((m) => m !== chosenModel),
  ]

  let replyText = ''
  let resolvedModel = chosenModel
  let upstreamError = ''

  for (const targetModel of modelQueue) {
    try {
      const ep = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: payloadBody,
        signal: AbortSignal.timeout(8_000),
      })

      if (res.status === 503 || res.status === 429) {
        upstreamError = `Model ${targetModel} status ${res.status}`
        continue
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        upstreamError = `Upstream error ${res.status}: ${errText.substring(0, 100)}`
        continue
      }

      const resJson = await res.json()
      const parts = (resJson?.candidates?.[0]?.content?.parts ?? []) as { text?: string; thought?: boolean }[]
      const textParts = parts
        .filter((p) => p.text && !p.thought)
        .map((p) => p.text!.trim())
        .filter(Boolean)

      let extracted = textParts.join('\n\n') || parts[0]?.text?.trim() || ''
      // Strip potential thinking artifact prefix if present
      extracted = extracted.replace(/^(\*{0,2}Thought Process:?[\s\S]*?\*{0,2}Output Generation\*{0,2}\s*)/i, '').trim()

      if (extracted && extracted.length >= 20) {
        replyText = extracted
        resolvedModel = targetModel
        break
      }
    } catch (err) {
      upstreamError = err instanceof Error ? err.message : String(err)
    }
  }

  // Graceful financial fallback if Google Gemini upstream hits free-tier rate limits or high-demand spikes
  if (!replyText) {
    const fallbackText = generateFallbackAdvice(dash, top, message)
    return NextResponse.json({
      reply: fallbackText,
      model: chosenModel,
      requestedModel: chosenModel,
      usedFallback: true,
      action: nlp.isTransactionIntent && nlp.transactionDraft
        ? { type: 'transaction_draft', data: nlp.transactionDraft }
        : undefined,
      note: upstreamError
        ? `Analisis berbasis metrik lokal (${upstreamError})`
        : 'Analisis berbasis metrik lokal KasDesk saat server antre',
    })
  }

  return NextResponse.json({
    reply: replyText,
    model: resolvedModel,
    requestedModel: chosenModel,
    usedFallback: resolvedModel !== chosenModel,
    action: nlp.isTransactionIntent && nlp.transactionDraft
      ? { type: 'transaction_draft', data: nlp.transactionDraft }
      : undefined,
  })
}
