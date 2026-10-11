'use client'

import { Flame, Trophy, CalendarCheck } from 'lucide-react'
import type { StreakResult } from '@/lib/analytics/streaks'

function motivationText(current: number): string {
  if (current >= 30) return 'Sebulan penuh konsisten! Kamu luar biasa 🏆'
  if (current >= 14) return 'Dua minggu berturut-turut! Terus pertahankan 💪'
  if (current >= 7) return 'Seminggu penuh mencatat! Hebat, jangan putus ⚡'
  if (current >= 3) return 'Momentum sudah terbentuk. Lanjutkan! 🔥'
  if (current >= 1) return 'Langkah pertama selalu yang terpenting. Catat lagi besok!'
  return 'Mulai catat hari ini untuk membangun streak pertamamu.'
}

export function StreakCard({ data }: { data: StreakResult }) {
  return (
    <article className="surface-card mb-6 rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-tile !h-9 !w-9 text-accent">
            <Flame className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Streak Pencatatan</h2>
            <p className="text-xs text-text-secondary">Hari berturut-turut mencatat keuangan</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
              {data.current}
            </span>
            <span className="text-sm font-semibold text-text-secondary">hari 🔥</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary max-w-md leading-relaxed">
            {motivationText(data.current)}
          </p>
        </div>

        <div className="flex gap-4 text-xs text-text-secondary shrink-0">
          <div className="text-center">
            <Trophy className="mx-auto h-3.5 w-3.5 text-amber-400 mb-1" aria-hidden />
            <p className="font-mono font-semibold text-text-primary text-sm">{data.best}</p>
            <p>Rekor</p>
          </div>
          <div className="text-center">
            <CalendarCheck className="mx-auto h-3.5 w-3.5 text-accent mb-1" aria-hidden />
            <p className="font-mono font-semibold text-text-primary text-sm">{data.totalDays}</p>
            <p>Total hari</p>
          </div>
        </div>
      </div>
    </article>
  )
}
