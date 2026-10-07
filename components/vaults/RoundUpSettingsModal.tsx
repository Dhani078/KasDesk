'use client'

import { useState } from 'react'
import { Sparkles, Coins, X, Check, ArrowRight } from 'lucide-react'
import { formatIDR } from '@/lib/format'
import {
  RoundUpConfig,
  RoundUpStep,
  getLocalRoundUpConfig,
  saveLocalRoundUpConfig,
  calculateRoundUp,
} from '@/lib/micro-savings'

export type VaultLite = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
}

export function RoundUpSettingsModal({ vaults }: { vaults: VaultLite[] }) {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<RoundUpConfig>(() => getLocalRoundUpConfig())
  const [savedSuccess, setSavedSuccess] = useState(false)
  const sampleAmount = 23000

  function handleOpen() {
    setConfig(getLocalRoundUpConfig())
    setOpen(true)
  }

  const targetVault = vaults.find((v) => v.id === config.targetVaultId) ?? vaults[0]
  const sampleCalc = calculateRoundUp(sampleAmount, config.step)

  function handleSave() {
    const finalConfig: RoundUpConfig = {
      ...config,
      targetVaultId: config.targetVaultId || vaults[0]?.id || null,
    }
    saveLocalRoundUpConfig(finalConfig)
    setConfig(finalConfig)
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      setOpen(false)
    }, 800)
  }

  const steps: { label: string; value: RoundUpStep; desc: string }[] = [
    { label: 'Rp 1.000', value: 1000, desc: 'Santai & ringan' },
    { label: 'Rp 5.000', value: 5000, desc: 'Rekomendasi seimbang' },
    { label: 'Rp 10.000', value: 10000, desc: 'Agresif & cepat tercapai' },
  ]

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 active:scale-95 cursor-pointer"
        title="Atur Celengan Pembulatan Belanja (Micro-Savings)"
      >
        <Coins className="h-3.5 w-3.5 text-amber-400" />
        <span>Celengan Pembulatan</span>
        {config.enabled && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in-up"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pengaturan Celengan Pembulatan"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border-outer bg-surface p-6 shadow-2xl space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
                  <Coins className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Celengan Pembulatan</h2>
                  <p className="text-xs text-text-secondary">Nabung receh otomatis dari tiap pengeluaran</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Enable Toggle Switch */}
            <div className="flex items-center justify-between rounded-2xl border border-border-inner bg-white/[0.03] p-4">
              <div>
                <p className="text-sm font-semibold text-text-primary">Aktifkan Celengan</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Bulatkan setiap belanjaan & sisihkan recehnya
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Target Vault Selection */}
            <div>
              <label htmlFor="roundup-vault" className="block text-xs font-medium text-text-secondary mb-1.5">
                Alokasi ke Target Tabungan (Vault)
              </label>
              {vaults.length === 0 ? (
                <p className="text-xs text-danger">
                  Belum ada Target Tabungan. Buat target tabungan terlebih dahulu.
                </p>
              ) : (
                <select
                  id="roundup-vault"
                  value={config.targetVaultId || vaults[0]?.id || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, targetVaultId: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-accent"
                >
                  {vaults.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Terkumpul {formatIDR(v.currentAmount)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Rounding Step Options */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Kelipatan Pembulatan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {steps.map((s) => {
                  const isSelected = config.step === s.value
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, step: s.value }))}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer ${
                        isSelected
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-sm'
                          : 'border-border-outer bg-white/[0.02] text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold">{s.label}</span>
                      <span className="text-[10px] text-text-secondary mt-1">{s.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Interactive Simulator Card */}
            <div className="rounded-2xl border border-border-inner bg-canvas p-4 text-xs space-y-2">
              <div className="flex items-center justify-between text-text-secondary">
                <span className="flex items-center gap-1 font-medium text-text-primary">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Simulasi Otomatis
                </span>
                <span className="text-[11px]">Contoh Belanja</span>
              </div>
              <div className="flex items-center justify-between font-mono pt-1 text-text-primary">
                <span>Belanja Rp 23.000</span>
                <ArrowRight className="h-3 w-3 text-text-secondary" />
                <span>Dibulatkan {formatIDR(sampleCalc.roundedTotal)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border-inner text-amber-300 font-semibold">
                <span>Otomatis Masuk Tabungan:</span>
                <span className="font-mono">+{formatIDR(sampleCalc.spareChange)}</span>
              </div>
              {targetVault && (
                <p className="text-[11px] text-text-secondary text-right pt-0.5">
                  Dialihkan ke: <b>{targetVault.name}</b>
                </p>
              )}
            </div>

            {/* Submit Action */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="secondary-button flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={vaults.length === 0}
                className="primary-button flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check className="h-4 w-4" /> Tersimpan!
                  </>
                ) : (
                  'Simpan Pengaturan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
