import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { log } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const headers = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET() {
  const started = Date.now()
  try {
    await db.execute(sql`SELECT 1`)
    const durationMs = Date.now() - started
    log('info', 'health.ok', { durationMs })
    return NextResponse.json({ status: 'ok', checks: { database: 'reachable' }, durationMs }, { headers })
  } catch {
    const durationMs = Date.now() - started
    log('error', 'health.database_unreachable', { durationMs })
    return NextResponse.json({ status: 'degraded', checks: { database: 'unreachable' } }, { status: 503, headers })
  }
}
