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
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

function hasValidImageSignature(buf: Buffer, mime: string): boolean {
  if (mime === 'image/jpeg') return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  if (mime === 'image/png') return buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))
  if (mime === 'image/webp') return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'
  if (mime === 'image/heic' || mime === 'image/heif') return buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp'
  return false
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

type ScanResult = {
  merchant_name: string
  items: { name: string; price: number; quantity: number }[]
  detected_total: number
  confidence_score: number
  detected_category: string
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
    return NextResponse.json({ error: 'NO_IMAGE' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'IMAGE_TOO_LARGE' }, { status: 413 })
  }
  if (!file.type || !ACCEPTED.includes(file.type)) {
    return NextResponse.json({ error: 'UNSUPPORTED_TYPE' }, { status: 415 })
  }

  // Image is held in memory only — never written to disk (spec §1.1 / FR-OCR-7).
  const buf = Buffer.from(await file.arrayBuffer())
  if (!hasValidImageSignature(buf, file.type)) {
    return NextResponse.json({ error: 'INVALID_IMAGE' }, { status: 415 })
  }
  const b64 = buf.toString('base64')

  // 5. Call Gemini (server-side key).
  let modelJson: unknown
  try {
    const upstream = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The key travels in a header, not the query string. A query string
        // ends up in proxy logs, CDN logs and — worst — any error message that
        // echoes the request URL, which is exactly how an API key leaks from a
        // server-side call the user never sees.
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Extract the receipt data from this image. Return only JSON.' },
              { inlineData: { mimeType: file.type || 'image/jpeg', data: b64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(30_000),
    })

    if (upstream.status === 429) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }
    if (!upstream.ok) {
      console.error('[scan-receipt] upstream', upstream.status)
      return NextResponse.json({ error: 'OCR_UPSTREAM_ERROR' }, { status: 502 })
    }

    const payload = await upstream.json()
    // Model may wrap JSON in markdown fences despite responseMimeType.
    const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    modelJson = JSON.parse(cleaned)
  } catch (e) {
    console.error('[scan-receipt]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'OCR_FAILED' }, { status: 502 })
  }

  // 6. Validate — spec §6.1. Never trust model output shape.
  const parsed = GeminiOCRResponseSchema.safeParse(modelJson)
  if (!parsed.success) {
    return NextResponse.json({ error: 'OCR_INVALID_RESPONSE' }, { status: 502 })
  }

  const d = parsed.data

  // spec §6.1 — reject non-positive prices/quantities outright.
  const badItems = d.items.some((i) => i.price <= 0 || i.quantity <= 0)
  if (badItems) {
    return NextResponse.json({ error: 'OCR_INVALID_RESPONSE' }, { status: 502 })
  }

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

  const result: ScanResult = {
    merchant_name: d.merchant_name,
    items: d.items,
    detected_total: total,
    confidence_score: d.confidence_score,
    detected_category: category,
    needs_confirmation: needsConfirmation,
    reason,
  }

  return NextResponse.json(result)
}
