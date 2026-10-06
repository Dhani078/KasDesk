'use client'

import { useState, useEffect } from 'react'
import { Shield, Lock, Download, Upload, KeyRound, Check, X, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { encryptBackup, decryptBackup } from '@/lib/crypto/backup'

export function EncryptedBackupModal() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'backup' | 'restore'>('backup')

  // Export / Backup State
  const [passphrase, setPassphrase] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // Restore / Decrypt State
  const [restorePassphrase, setRestorePassphrase] = useState('')
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptedPreview, setDecryptedPreview] = useState<{
    walletsCount: number
    txCount: number
    date: string
  } | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  async function handleCreateBackup(e: React.FormEvent) {
    e.preventDefault()
    setExportError(null)
    setExportSuccess(false)

    if (passphrase.length < 6) {
      setExportError('Passphrase minimal 6 karakter.')
      return
    }

    setIsExporting(true)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error('Gagal mengunduh data dari server.')
      const rawData = await res.json()

      const encryptedText = await encryptBackup(rawData, passphrase)

      // Trigger client-side file download
      const blob = new Blob([encryptedText], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const today = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `kasdesk-backup-${today}.kasdesk.enc`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      setPassphrase('')
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'Gagal membuat cadangan terenkripsi.')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleInspectBackup(e: React.FormEvent) {
    e.preventDefault()
    setRestoreError(null)
    setDecryptedPreview(null)

    if (!restoreFile) {
      setRestoreError('Pilih berkas .kasdesk.enc terlebih dahulu.')
      return
    }
    if (!restorePassphrase) {
      setRestoreError('Masukkan passphrase enkripsi berkas.')
      return
    }

    setIsDecrypting(true)
    try {
      const fileText = await restoreFile.text()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await decryptBackup(fileText, restorePassphrase)

      setDecryptedPreview({
        walletsCount: Array.isArray(data?.wallets) ? data.wallets.length : 0,
        txCount: Array.isArray(data?.transactions) ? data.transactions.length : 0,
        date: data?.exportedAt || 'Tidak diketahui',
      })
    } catch (err: unknown) {
      setRestoreError(err instanceof Error ? err.message : 'Gagal mendekripsi berkas cadangan.')
    } finally {
      setIsDecrypting(false)
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="setting-row group cursor-pointer transition hover:bg-white/[0.03] active:scale-[0.99] flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <span className="icon-tile text-accent shrink-0">
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-text-primary text-sm">Cadangan Terenkripsi (Zero-Knowledge)</p>
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider">
                AES-256
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Enkripsi data client-side dengan passphrase pribadi Anda.
            </p>
          </div>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cadangan Terenkripsi Zero-Knowledge"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-border-outer bg-surface p-6 shadow-2xl animate-fade-in-up my-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-inner pb-3">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile !h-9 !w-9 text-accent">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Cadangan Terenkripsi</h3>
                  <p className="text-[11px] text-text-secondary">Standar Web Crypto AES-256-GCM + PBKDF2</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg cursor-pointer"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 rounded-xl bg-canvas p-1 border border-border-outer">
              <button
                type="button"
                onClick={() => setTab('backup')}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  tab === 'backup' ? 'bg-accent-solid text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Buat Cadangan Baru
              </button>
              <button
                type="button"
                onClick={() => setTab('restore')}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  tab === 'restore' ? 'bg-accent-solid text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Uji / Periksa Cadangan
              </button>
            </div>

            {tab === 'backup' ? (
              <form onSubmit={handleCreateBackup} className="space-y-4 text-xs">
                <div className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-accent text-xs">
                    <KeyRound className="h-3.5 w-3.5" />
                    Jaminan Keamanan Zero-Knowledge
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    Data Anda dienkripsi langsung di browser dengan algoritma AES-256-GCM. Passphrase tidak pernah dikirim ke server.
                  </p>
                </div>

                <div>
                  <label htmlFor="enc-pass" className="mb-1 block font-medium text-text-secondary">
                    Buat Passphrase Enkripsi (Kunci Rahasia)
                  </label>
                  <div className="relative">
                    <input
                      id="enc-pass"
                      type={showPass ? 'text' : 'password'}
                      required
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Minimal 6 karakter unik..."
                      className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 pr-10 text-xs text-text-primary outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-1 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-text-secondary/70">
                    ⚠️ Simpan passphrase ini baik-baik. Tanpa passphrase, berkas cadangan tidak akan dapat dibuka sama sekali.
                  </p>
                </div>

                {exportError && (
                  <p role="alert" className="text-danger bg-danger/10 p-2.5 rounded-xl border border-danger/25 text-xs">
                    {exportError}
                  </p>
                )}

                {exportSuccess && (
                  <p role="status" className="text-accent-income bg-accent-income/10 p-2.5 rounded-xl border border-accent-income/25 text-xs flex items-center gap-1.5">
                    <Check className="h-4 w-4" /> Berkas cadangan (.kasdesk.enc) berhasil diunduh!
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isExporting || passphrase.length < 6}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-solid py-2.5 px-4 text-xs font-semibold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isExporting ? 'Mengenkripsi & Mengunduh…' : 'Enkripsi & Unduh Cadangan'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleInspectBackup} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="restore-file-input" className="mb-1 block font-medium text-text-secondary">
                    Pilih Berkas Cadangan (.kasdesk.enc)
                  </label>
                  <input
                    id="restore-file-input"
                    type="file"
                    accept=".enc,.json"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-text-primary file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-white/[0.08] file:text-text-primary cursor-pointer"
                  />
                </div>

                <div>
                  <label htmlFor="restore-pass-input" className="mb-1 block font-medium text-text-secondary">
                    Masukkan Passphrase Pembuka
                  </label>
                  <input
                    id="restore-pass-input"
                    type="password"
                    required
                    value={restorePassphrase}
                    onChange={(e) => setRestorePassphrase(e.target.value)}
                    placeholder="Masukkan passphrase..."
                    className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-accent"
                  />
                </div>

                {restoreError && (
                  <p role="alert" className="text-danger bg-danger/10 p-2.5 rounded-xl border border-danger/25 text-xs flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {restoreError}
                  </p>
                )}

                {decryptedPreview && (
                  <div className="rounded-2xl border border-accent-income/30 bg-accent-income/[0.05] p-3.5 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-accent-income">
                      <Check className="h-4 w-4" /> Berkas Terverifikasi &amp; Siap Dipulihkan
                    </div>
                    <p className="text-text-primary mt-1">
                      • Terdeteksi {decryptedPreview.walletsCount} dompet &amp; {decryptedPreview.txCount} riwayat transaksi.
                    </p>
                    <p className="text-text-secondary text-[11px]">
                      Dibuat pada: {decryptedPreview.date}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isDecrypting || !restoreFile || !restorePassphrase}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-solid py-2.5 px-4 text-xs font-semibold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isDecrypting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isDecrypting ? 'Mendekripsi Data…' : 'Dekripsi & Verifikasi Berkas'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
