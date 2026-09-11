'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus } from 'lucide-react'
import { createRecurringAction, saveBudgetAction, type PlanningState } from '@/lib/planning/actions'

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return <button disabled={pending} className="primary-button disabled:cursor-wait disabled:opacity-60"><Plus className="h-4 w-4" aria-hidden />{pending ? 'Menyimpan…' : children}</button>
}
function Status({ state }: { state: PlanningState }) {
  if (!state?.error && !state?.success) return null
  return <p role={state.error ? 'alert' : 'status'} aria-live="polite" className={`sm:col-span-2 rounded-xl px-3 py-2 text-sm ${state.error ? 'bg-danger/10 text-danger' : 'bg-accent-income/10 text-accent-income'}`}>{state.error ?? state.success}</p>
}
export function BudgetForm({ month, categories }: { month: string; categories: readonly string[] }) {
  const [state, action] = useActionState<PlanningState, FormData>(saveBudgetAction, null)
  return <form action={action} className="surface-card form-grid rounded-3xl p-5 sm:grid-cols-3"><input type="hidden" name="month" value={month}/><label className="field-label">Kategori<select name="category">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field-label">Batas pengeluaran<input name="amount" inputMode="numeric" required placeholder="Contoh: 1500000" /></label><SubmitButton>Simpan budget</SubmitButton><Status state={state}/></form>
}
export function RecurringForm({ categories }: { categories: readonly string[] }) {
  const [state, action] = useActionState<PlanningState, FormData>(createRecurringAction, null)
  return <form action={action} className="surface-card form-grid rounded-3xl p-5 sm:grid-cols-2"><label className="field-label sm:col-span-2">Nama pengingat<input name="title" required maxLength={120} placeholder="Contoh: Bayar internet" /></label><label className="field-label">Nominal<input name="amount" required inputMode="numeric" placeholder="Contoh: 350000" /></label><label className="field-label">Jenis<select name="type"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select></label><label className="field-label">Kategori<select name="category">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="field-label">Berulang<select name="frequency"><option value="monthly">Setiap bulan</option><option value="weekly">Setiap minggu</option></select></label><label className="field-label sm:col-span-2">Jadwal berikutnya<input name="nextRunAt" type="datetime-local" required /></label><SubmitButton>Tambah pengingat</SubmitButton><Status state={state}/></form>
}
