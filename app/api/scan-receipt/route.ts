import { NextResponse } from 'next/server'

import { requireUserId } from '@/lib/auth/session'
import { checkDistributedRateLimit } from '@/lib/auth/distributed-rate-limit'
import {
  GeminiOCRResponseSchema,
  CATEGORY_ENUM,
  SYSTEM_PROMPT,
  MIN_TOTAL,
  MAX_TOTAL,
  CONFIDENCE_GATE,
} from '@/lib/ocr/contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** AI-OCR-SPEC §1.1 step 2 — client downscales first; this is the backstop. */
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

function detectMime(buf: Buffer, clientMime?: string): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return 'image/heic'
  const lower = (clientMime || '').toLowerCase().trim()
  if (lower === 'image/jpeg' || lower === 'image/jpg' || lower === 'image/pjpeg') return 'image/jpeg'
  if (lower === 'image/png' || lower === 'image/x-png') return 'image/png'
  if (lower === 'image/webp') return 'image/webp'
  if (lower === 'image/heic' || lower === 'image/heif') return 'image/heic'
  return null
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'

type ScanResult = {
  merchant_name: string
  items: { name: string; price: number; quantity: number }[]
  detected_total: number
  confidence_score: number
  detected_category: string
  detected_date?: string | null
  /** True when the user must confirm before saving (spec §6.2 / §6.3). */
  needs_confirmation: boolean
  reason?: string
}

export async function POST(req: Request) {
  // 1. Auth — spec §1.1 step 3.
  const userId = await requireUserId()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 })
  }

  // 2. Rate limit per user (spec §5.3). Keyed by user, not IP: an IP-based
  //    limit would let one attacker lock out everyone on shared mobile NAT.
  const rl = await checkDistributedRateLimit('ocr', userId, 20, 60)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retry_after: rl.retryAfterSec },
      { status: 429 },
    )
  }

  // 3. Feature gate — fail CLOSED. Without a key we must never attempt the
  //    upstream call; a silent misconfiguration would burn quota or leak.
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OCR_NOT_CONFIGURED', message: 'OCR belum dikonfigurasi.' },
      { status: 503 },
    )
  }

  // 4. Parse + pre-flight checks.
  //
  // Content-Length is checked BEFORE parsing the body. req.formData() buffers
  // the whole request in memory, so without this a 500 MB upload would be read
  // into RAM and only rejected afterwards — the size check below would never
  // get a chance to run. The header is advisory (a client may omit or lie), so
  // the post-parse file.size check stays as the real gate.
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared && declared > MAX_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: 'IMAGE_TOO_LARGE' }, { status: 413 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const file = form.get('image')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'NO_IMAGE', message: 'Tidak ada berkas gambar yang diunggah.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'IMAGE_TOO_LARGE', message: 'Ukuran gambar melebihi batas 10 MB.' }, { status: 413 })
  }

  // Image is held in memory only — never written to disk (spec §1.1 / FR-OCR-7).
  const buf = Buffer.from(await file.arrayBuffer())
  const mimeType = detectMime(buf, file.type)

  if (!mimeType) {
    return NextResponse.json({ error: 'UNSUPPORTED_TYPE', message: 'Format gambar tidak didukung (gunakan JPG, PNG, atau WebP).' }, { status: 415 })
  }
  if (mimeType === 'image/heic') {
    return NextResponse.json({ error: 'UNSUPPORTED_TYPE', message: 'Format HEIC/Live Photo tidak dapat dibaca oleh AI Vision. Mohon gunakan format JPG/PNG atau screenshot struk.' }, { status: 415 })
  }

  const b64 = buf.toString('base64')

  // 5. Call Gemini (server-side key).
  let modelJson: unknown
  try {
    const payloadBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Extract the receipt data from this image. Return only JSON.' },
            { inlineData: { mimeType, data: b64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    })

    let upstream = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: payloadBody,
      signal: AbortSignal.timeout(30_000),
    })

    // Auto-fallback if the primary flash model faces temporary high demand (503), quota limit (429), or server error
    if (!upstream.ok && (upstream.status >= 500 || upstream.status === 429)) {
      for (const fallbackModel of ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash']) {
        try {
          const fallbackRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              body: payloadBody,
              signal: AbortSignal.timeout(30_000),
            }
          )
          if (fallbackRes.ok) {
            upstream = fallbackRes
            break
          }
        } catch {
          // Continue to next fallback model
        }
      }
    }

    if (upstream.status === 429) {
      return NextResponse.json({ error: 'RATE_LIMITED', message: 'Server AI sedang sibuk. Silakan coba beberapa saat lagi.' }, { status: 429 })
    }
    if (!upstream.ok) {
      console.error('[scan-receipt] upstream', upstream.status)
      return NextResponse.json({ error: 'OCR_UPSTREAM_ERROR', message: 'Gagal menghubungi layanan AI. Silakan coba lagi.' }, { status: 502 })
    }

    const payload = await upstream.json()
    // Model may wrap JSON in markdown fences despite responseMimeType.
    const parts = (payload?.candidates?.[0]?.content?.parts ?? []) as { text?: string; thought?: boolean }[]
    const raw = parts.find((p) => p.text && !p.thought)?.text || parts[0]?.text || ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    modelJson = JSON.parse(cleaned)
  } catch (e) {
    console.error('[scan-receipt]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'OCR_FAILED', message: 'Gagal memproses gambar struk. Silakan periksa gambar atau catat manual.' }, { status: 502 })
  }

  // 6. Validate — spec §6.1. Never trust model output shape.
  const parsed = GeminiOCRResponseSchema.safeParse(modelJson)
  if (!parsed.success) {
    return NextResponse.json({ error: 'OCR_INVALID_RESPONSE', message: 'Format data struk tidak dikenali.' }, { status: 502 })
  }

  const d = parsed.data

  // Sanitize line items: retain items with positive price & quantity without crashing on discount rows
  d.items = (d.items || []).filter((i) => i.price > 0 && i.quantity > 0)

  // Coerce unknown categories instead of failing (spec §2.2).
  const category = (CATEGORY_ENUM as readonly string[]).includes(d.detected_category)
    ? d.detected_category
    : 'LAINNYA'

  const total = Math.trunc(d.detected_total)

  // 7. Confidence gate + sanity bounds (spec §6.2, §6.3).
  let needsConfirmation = false
  let reason: string | undefined

  if (total === 0) {
    needsConfirmation = true
    reason = 'UNREADABLE_TOTAL'
  } else if (d.confidence_score < CONFIDENCE_GATE) {
    needsConfirmation = true
    reason = 'LOW_CONFIDENCE'
  } else if (total < MIN_TOTAL || total > MAX_TOTAL) {
    needsConfirmation = true
    reason = 'OUT_OF_BOUNDS'
  } else if (d.items.length > 0) {
    // Cross-check: >50% gap between line items and stated total suggests
    // a misread. Tax/service explains small gaps only.
    const sum = d.items.reduce((s, i) => s + i.price * i.quantity, 0)
    if (sum > 0 && Math.abs(sum - total) / total > 0.5) {
      needsConfirmation = true
      reason = 'TOTAL_MISMATCH'
    }
  }

  // Extract and sanitize detected_date if provided in YYYY-MM-DD format
  let detectedDate: string | null = null
  if (d.detected_date && typeof d.detected_date === 'string') {
    const trimmed = d.detected_date.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsedD = new Date(trimmed)
      if (!isNaN(parsedD.getTime())) {
        detectedDate = trimmed
      }
    }
  }

  const result: ScanResult = {
    merchant_name: d.merchant_name,
    items: d.items,
    detected_total: total,
    confidence_score: d.confidence_score,
    detected_category: category,
    detected_date: detectedDate,
    needs_confirmation: needsConfirmation,
    reason,
  }

  return NextResponse.json(result)
}
