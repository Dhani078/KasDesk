'use client'

import { useState, useRef, useTransition } from 'react'
import { Camera, Upload, Check, AlertCircle, RefreshCw, X, ArrowRight } from 'lucide-react'
import { reconcileWalletBalance } from '@/lib/wallets/reconcile'
import { formatIDR } from '@/lib/format'
import { useRouter } from 'next/navigation'

interface WalletOption {
  id: string
  name: string
  balance: number
}

interface ScanData {
  detected_balance: number
  detected_bank_or_wallet: string
  current_balance: number
  difference: number
  wallet_name: string
  confidence_score: number
}

export function SyncWalletModal({ wallets }: { wallets: WalletOption[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id || '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const currentWallet = wallets.find((w) => w.id === selectedWalletId)

  const resetState = () => {
    setPreviewUrl(null)
    setIsScanning(false)
    setScanResult(null)
    setErrorMsg('')
    setSuccessMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg('')
    setSuccessMsg('')
    setScanResult(null)
    setPreviewUrl(URL.createObjectURL(file))
    setIsScanning(true)

    try {
      const formData = new FormData()
      formData.append('image', file)
      if (selectedWalletId) {
        formData.append('walletId', selectedWalletId)
      }

      const res = await fetch('/api/wallets/scan-balance', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Gagal mendeteksi saldo dari gambar')
      }

      setScanResult(data.data)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses gambar')
    } finally {
      setIsScanning(false)
    }
  }

  const handleApplyReconcile = () => {
    if (!scanResult || !selectedWalletId) return
    setErrorMsg('')

    startTransition(async () => {
      const res = await reconcileWalletBalance({
        walletId: selectedWalletId,
        targetBalance: scanResult.detected_balance,
        note: `Scan Screenshot Saldo ${scanResult.detected_bank_or_wallet}`,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menyimpan penyesuaian saldo')
        return
      }

      setSuccessMsg(`Saldo ${currentWallet?.name || 'dompet'} berhasil diselaraskan ke ${formatIDR(scanResult.detected_balance)}!`)
      router.refresh()
      setTimeout(() => {
        setIsOpen(false)
        resetState()
      }, 1400)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetState()
          setIsOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 active:scale-95"
      >
        <Camera className="h-3.5 w-3.5" />
        Scan Saldo (Screenshot)
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isScanning && !isPending) setIsOpen(false)
          }}
        >
          <div className="surface-card w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-border-outer space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-inner">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile !h-9 !w-9 text-accent">
                  <Camera className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Sinkronisasi Saldo Dompet</h3>
                  <p className="text-xs text-text-secondary">Scan screenshot m-banking / e-wallet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-white/[0.05]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Wallet Selector */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Pilih Dompet yang Akan Diselaraskan
              </label>
              <select
                value={selectedWalletId}
                onChange={(e) => {
                  setSelectedWalletId(e.target.value)
                  setScanResult(null)
                }}
                disabled={isScanning || isPending}
                className="w-full rounded-xl border border-border-outer bg-canvas px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — Saldo KasDesk: {formatIDR(w.balance)}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload Zone */}
            <div
              onClick={() => !isScanning && !isPending && fileInputRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-border-outer bg-white/[0.02] p-5 text-center transition hover:border-accent/40 hover:bg-white/[0.04]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              {previewUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview Screenshot"
                    className="mx-auto max-h-40 rounded-xl object-contain border border-border-inner"
                  />
                  <p className="text-xs text-accent">Ketuk untuk mengganti screenshot</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-text-primary">
                    Pilih screenshot layar saldo m-Banking / e-Wallet
                  </p>
                  <p className="text-[11px] text-text-secondary">Mendukung BCA, Mandiri, SeaBank, GoPay, ShopeePay, DANA, dsb.</p>
                </div>
              )}
            </div>

            {/* Scanning Indicator */}
            {isScanning && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-accent/10 p-3 text-xs text-accent">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>AI sedang menganalisis nominal saldo dari screenshot...</span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-accent-income/30 bg-accent-income/10 p-3 text-xs text-accent-income">
                <Check className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Scan Result Comparison Card */}
            {scanResult && !successMsg && (
              <div className="rounded-2xl border border-border-outer bg-canvas p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Penyedia Terdeteksi:</span>
                  <span className="font-semibold text-text-primary">{scanResult.detected_bank_or_wallet}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-y border-border-inner/60 py-2.5">
                  <div>
                    <span className="text-text-secondary block">Saldo KasDesk:</span>
                    <span className="font-mono font-semibold text-text-primary">
                      {formatIDR(currentWallet?.balance ?? scanResult.current_balance)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-text-secondary block">Hasil Scan (Rekening):</span>
                    <span className="font-mono font-semibold text-accent">
                      {formatIDR(scanResult.detected_balance)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Selisih Penyesuaian:</span>
                  <span
                    className={`font-mono font-semibold ${
                      scanResult.difference > 0
                        ? 'text-accent-income'
                        : scanResult.difference < 0
                        ? 'text-accent-expense'
                        : 'text-text-secondary'
                    }`}
                  >
                    {scanResult.difference > 0 ? '+' : ''}
                    {formatIDR(scanResult.difference)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyReconcile}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-solid py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  {isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Selaraskan Saldo Sekarang</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
