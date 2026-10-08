'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { FileSpreadsheet, Upload, Check, AlertCircle, RefreshCw, X, ArrowRight, CheckSquare, Square } from 'lucide-react'
import {
  parseBankStatement,
  type ParsedStatementRow,
  type BankPreset,
} from '@/lib/importer/statement-parser'
import { importStatementBatchAction } from '@/lib/importer/actions'
import { formatIDR } from '@/lib/format'
import { CATEGORY_ENUM } from '@/lib/schemas'
import { useRouter } from 'next/navigation'

interface WalletOption {
  id: string
  name: string
  balance: number
}

export function StatementImportModal({ wallets }: { wallets: WalletOption[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id || '')
  const [preset, setPreset] = useState<BankPreset>('auto')
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedStatementRow[]>([])
  const [selectedFps, setSelectedFps] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const resetState = () => {
    setRawText('')
    setFileName('')
    setParsedRows([])
    setSelectedFps(new Set())
    setErrorMsg('')
    setSuccessMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        resetState()
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isPending])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrorMsg('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setRawText(content)
      handleParseText(content)
    }
    reader.readAsText(file)
  }

  const handleParseText = (textToParse: string) => {
    if (!textToParse.trim()) {
      setErrorMsg('Teks mutasi kosong')
      return
    }

    try {
      const rows = parseBankStatement(textToParse, preset)
      if (rows.length === 0) {
        setErrorMsg('Tidak ditemukan mutasi yang valid dari teks/berkas yang diberikan')
        return
      }

      setParsedRows(rows)
      // By default select non-duplicates
      const initialSelected = new Set(rows.filter((r) => !r.isDuplicate).map((r) => r.fingerprint))
      setSelectedFps(initialSelected)
      setErrorMsg('')
    } catch {
      setErrorMsg('Gagal memproses data mutasi')
    }
  }

  const toggleSelectRow = (fp: string) => {
    setSelectedFps((prev) => {
      const next = new Set(prev)
      if (next.has(fp)) next.delete(fp)
      else next.add(fp)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedFps.size === parsedRows.length) {
      setSelectedFps(new Set())
    } else {
      setSelectedFps(new Set(parsedRows.map((r) => r.fingerprint)))
    }
  }

  const handleUpdateCategory = (fp: string, newCat: string) => {
    const validCat = CATEGORY_ENUM.includes(newCat as (typeof CATEGORY_ENUM)[number])
      ? (newCat as (typeof CATEGORY_ENUM)[number])
      : 'LAINNYA'
    setParsedRows((prev) =>
      prev.map((r) => (r.fingerprint === fp ? { ...r, category: validCat } : r)),
    )
  }

  const handleImportSelected = () => {
    if (selectedFps.size === 0) {
      setErrorMsg('Pilih minimal satu mutasi untuk diimpor')
      return
    }

    const toImport = parsedRows
      .filter((r) => selectedFps.has(r.fingerprint))
      .map((r) => ({
        fingerprint: r.fingerprint,
        date: r.date,
        type: r.type,
        amount: r.amount,
        title: r.title,
        category: r.category,
      }))

    setErrorMsg('')
    startTransition(async () => {
      const res = await importStatementBatchAction({
        walletId: selectedWalletId,
        items: toImport,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal mengimpor mutasi')
        return
      }

      setSuccessMsg(`Berhasil mengimpor ${res.count} mutasi! Saldo dompet otomatis disesuaikan.`)
      router.refresh()
      setTimeout(() => {
        setIsOpen(false)
        resetState()
      }, 1600)
    })
  }

  const selectedRows = parsedRows.filter((r) => selectedFps.has(r.fingerprint))
  const totalIn = selectedRows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const totalOut = selectedRows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          resetState()
          setIsOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 active:scale-95 cursor-pointer"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Impor Mutasi (CSV / Rekening)
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsOpen(false)
          }}
        >
          <div className="surface-card w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-border-outer space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-inner">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile !h-9 !w-9 text-accent">
                  <FileSpreadsheet className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Impor Mutasi Rekening &amp; E-Wallet</h3>
                  <p className="text-xs text-text-secondary">Ekstraksi lokal aman (BCA, Mandiri, SeaBank, CSV)</p>
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

            {/* Target Wallet & Preset */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-text-secondary mb-1">Dompet Tujuan KasDesk:</label>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border-outer bg-canvas px-3 py-2 text-text-primary text-sm focus:border-accent focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {formatIDR(w.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-secondary mb-1">Format Institusi Bank:</label>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as BankPreset)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border-outer bg-canvas px-3 py-2 text-text-primary text-sm focus:border-accent focus:outline-none"
                >
                  <option value="auto">Deteksi Otomatis (Auto-Detect)</option>
                  <option value="bca">BCA (KlikBCA / myBCA CSV)</option>
                  <option value="mandiri">Mandiri (Livin TSV/CSV)</option>
                  <option value="seabank">SeaBank (CSV Mutasi)</option>
                  <option value="bri">BRI (BRImo CSV)</option>
                  <option value="generic">Generic CSV / Teks Notifikasi</option>
                </select>
              </div>
            </div>

            {/* Step 1: Input (Dropzone or Textarea) */}
            {parsedRows.length === 0 ? (
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-border-outer bg-white/[0.02] p-5 text-center transition hover:border-accent/40 hover:bg-white/[0.04]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent mb-2">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-text-primary">
                    {fileName ? `Berkas terpilih: ${fileName}` : 'Unggah berkas mutasi CSV / TXT / TSV'}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    100% diproses langsung di peramban tanpa kirim berkas ke pihak ketiga.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                    <span>Atau Salin &amp; Tempel (Paste) Teks Mutasi:</span>
                    <button
                      type="button"
                      onClick={() => handleParseText(rawText)}
                      className="text-accent font-semibold hover:underline"
                    >
                      Urai Teks &rarr;
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Contoh salinan e-Statement / notifikasi SMS:&#10;01/10/2026 QRIS INDOMARET Rp 45.000 DB&#10;02/10/2026 TRSF GAJI Rp 5.000.000 CR"
                    className="w-full rounded-2xl border border-border-outer bg-canvas p-3 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Step 2: Parsed Table Review */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-1.5 font-semibold text-accent hover:underline cursor-pointer"
                    >
                      {selectedFps.size === parsedRows.length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      <span>Pilih Semua ({selectedFps.size}/{parsedRows.length})</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={resetState}
                    className="text-text-secondary hover:text-text-primary text-[11px] underline"
                  >
                    Ganti Berkas / Ulangi
                  </button>
                </div>

                {/* Mutation Table */}
                <div className="rounded-2xl border border-border-outer bg-canvas overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/[0.03] text-text-secondary border-b border-border-inner sticky top-0 backdrop-blur-sm">
                      <tr>
                        <th className="p-2.5 w-8"></th>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Deskripsi</th>
                        <th className="p-2.5">Kategori</th>
                        <th className="p-2.5 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-inner/60">
                      {parsedRows.map((row) => {
                        const isChecked = selectedFps.has(row.fingerprint)
                        return (
                          <tr
                            key={row.fingerprint}
                            className={`transition hover:bg-white/[0.02] ${
                              isChecked ? 'bg-accent/5' : 'opacity-70'
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectRow(row.fingerprint)}
                                className="rounded border-border-outer text-accent focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 font-mono whitespace-nowrap text-[11px]">
                              {row.date}
                            </td>
                            <td className="p-2.5 font-medium truncate max-w-[180px]" title={row.title}>
                              {row.title}
                            </td>
                            <td className="p-2.5">
                              <select
                                value={row.category}
                                onChange={(e) => handleUpdateCategory(row.fingerprint, e.target.value)}
                                className="rounded-lg border border-border-inner bg-surface px-1.5 py-0.5 text-[11px] text-text-primary focus:outline-none"
                              >
                                {CATEGORY_ENUM.map((c) => (
                                  <option key={c} value={c}>
                                    #{c}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td
                              className={`p-2.5 text-right font-mono font-semibold whitespace-nowrap ${
                                row.type === 'income' ? 'text-accent-income' : 'text-accent-expense'
                              }`}
                            >
                              {row.type === 'income' ? '+' : '-'}
                              {formatIDR(row.amount)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Box */}
                <div className="rounded-2xl border border-border-outer bg-white/[0.02] p-3 grid grid-cols-2 text-xs">
                  <div>
                    <span className="text-text-secondary block text-[10px]">Total Terpilih Masuk:</span>
                    <span className="font-mono font-semibold text-accent-income">+{formatIDR(totalIn)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-text-secondary block text-[10px]">Total Terpilih Keluar:</span>
                    <span className="font-mono font-semibold text-accent-expense">-{formatIDR(totalOut)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
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

            {/* Action Buttons */}
            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={handleImportSelected}
                disabled={isPending || selectedFps.size === 0}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-solid py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Simpan {selectedFps.size} Mutasi Terpilih ke KasDesk</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
