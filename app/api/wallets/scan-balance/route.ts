import { NextResponse } from 'next/server'
import { requireUserId } from '@/lib/auth/session'
import { checkDistributedRateLimit } from '@/lib/auth/distributed-rate-limit'
import { db } from '@/lib/db'
import { wallets } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
]

function detectMimeFromBytes(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

const SYSTEM_PROMPT = `Kamu adalah OCR detector saldo perbankan dan e-wallet Indonesia (BCA, Mandiri, BRImo, BNI, SeaBank, Jago, GoPay, OVO, ShopeePay, DANA, LinkAja).
Tugasmu: Analisis gambar screenshot aplikasi perbankan/e-wallet untuk membaca SALDO UTAMA.

Aturan Ekstraksi:
1. detected_balance: Angka integer positif saldo rekening utama/dompet yang tertera di layar (contoh: 1500000). Bersihkan titik, koma desimal, atau teks "Rp". Jika ada desimal ",00" buang bagian sen.
2. detected_bank_or_wallet: Nama bank atau penyedia e-wallet yang terdeteksi (contoh: "SeaBank", "BCA", "GoPay", "ShopeePay", "Mandiri", "Jago"). Jika tidak yakin, tulis "Bank / E-Wallet".
3. confidence_score: Tingkat keyakinan bacaan antara 0.0 sampai 1.0.

Kembalikan HANYA format JSON valid tanpa format markdown tambahan:
{
  "detected_balance": number,
  "detected_bank_or_wallet": string,
  "confidence_score": number
}`

export async function POST(req: Request) {
  // 1. Auth check
  const userId = await requireUserId()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  // 2. Distributed rate limit: 15 scans per minute per user
  const rl = await checkDistributedRateLimit('balance-scan', userId, 15, 60)
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

  // 4. Form data parsing
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Permintaan tidak valid' }, { status: 400 })
  }

  const file = formData.get('image')
  const walletId = formData.get('walletId') as string | null

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'NO_IMAGE', message: 'File gambar wajib diunggah' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const mimeType = detectMimeFromBytes(buffer)

  if (!mimeType) {
    return NextResponse.json(
      { error: 'INVALID_IMAGE', message: 'Format gambar tidak didukung. Harap unggah JPEG, PNG, atau WebP.' },
      { status: 400 }
    )
  }

  const base64Image = buffer.toString('base64')
  const payloadBody = JSON.stringify({
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
    },
  })

  let rawJsonText = ''
  let usedModel = ''
  let lastError = ''

  for (const model of GEMINI_MODELS) {
    try {
      const ep = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: payloadBody,
        signal: AbortSignal.timeout(12_000),
      })

      if (res.status === 503 || res.status === 429) {
        lastError = `Model ${model} unavailable (${res.status})`
        continue
      }

      if (!res.ok) {
        lastError = `Model ${model} returned ${res.status}`
        continue
      }

      const resJson = await res.json()
      const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) {
        rawJsonText = text
        usedModel = model
        break
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  if (!rawJsonText) {
    return NextResponse.json(
      { error: 'OCR_UNAVAILABLE', message: `Server antre saat memproses gambar (${lastError})` },
      { status: 502 }
    )
  }

  try {
    const cleaned = rawJsonText.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned) as {
      detected_balance?: number
      detected_bank_or_wallet?: string
      confidence_score?: number
    }

    const detectedBalance = Math.round(Number(parsed.detected_balance || 0))
    const bankName = String(parsed.detected_bank_or_wallet || 'Bank / E-Wallet').trim()
    const confidence = Number(parsed.confidence_score || 0.8)

    let currentBalance = 0
    let difference = 0
    let walletName = ''

    if (walletId) {
      const [w] = await db
        .select({ id: wallets.id, name: wallets.name, balance: wallets.balance })
        .from(wallets)
        .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
        .limit(1)

      if (w) {
        currentBalance = Number(w.balance)
        difference = detectedBalance - currentBalance
        walletName = w.name
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        detected_balance: detectedBalance,
        detected_bank_or_wallet: bankName,
        current_balance: currentBalance,
        difference,
        wallet_name: walletName,
        confidence_score: confidence,
        model: usedModel,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'OCR_PARSE_FAILED', message: 'Gagal membaca format saldo dari screenshot' },
      { status: 502 }
    )
  }
}
