'use client'

import { useEffect, useState, useTransition } from 'react'
import { Lock, KeyRound, Fingerprint, Check, X, Loader2 } from 'lucide-react'
import {
  isAppLockConfigured,
  saveNewPin,
  verifyEnteredPin,
  removeAppLock,
  checkBiometricsSupport,
  isBiometricsEnabled,
  registerBiometrics,
  setBiometricsEnabled,
} from '@/lib/app-lock'

export function AppLockSettings() {
  const [enabled, setEnabled] = useState(false)
  const [bioSupported, setBioSupported] = useState(false)
  const [bioActive, setBioActive] = useState(false)

  // Modals state
  const [modalMode, setModalMode] = useState<'none' | 'setup' | 'change' | 'disable'>('none')
  const [step, setStep] = useState<'enter-current' | 'enter-new' | 'confirm-new'>('enter-new')
  const [inputPin, setInputPin] = useState('')
  const [tempPin, setTempPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    const frame = requestAnimationFrame(() => {
      if (cancelled) return
      setEnabled(isAppLockConfigured())
      setBioActive(isBiometricsEnabled())
    })
    checkBiometricsSupport().then((supported) => {
      if (!cancelled) setBioSupported(supported)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [])

  const resetModal = () => {
    setModalMode('none')
    setStep('enter-new')
    setInputPin('')
    setTempPin('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleSetupClick = () => {
    setInputPin('')
    setTempPin('')
    setErrorMsg('')
    setStep('enter-new')
    setModalMode('setup')
  }

  const handleChangePinClick = () => {
    setInputPin('')
    setTempPin('')
    setErrorMsg('')
    setStep('enter-current')
    setModalMode('change')
  }

  const handleDisableClick = () => {
    setInputPin('')
    setErrorMsg('')
    setStep('enter-current')
    setModalMode('disable')
  }

  const handleKeyTap = async (num: string) => {
    if (inputPin.length >= 6) return
    setErrorMsg('')
    const next = inputPin + num
    setInputPin(next)

    if (next.length === 6) {
      if (modalMode === 'disable') {
        const ok = await verifyEnteredPin(next)
        if (ok) {
          removeAppLock()
          setEnabled(false)
          setBioActive(false)
          resetModal()
        } else {
          setErrorMsg('PIN salah.')
          setTimeout(() => setInputPin(''), 400)
        }
      } else if (modalMode === 'setup') {
        if (step === 'enter-new') {
          setTempPin(next)
          setInputPin('')
          setStep('confirm-new')
        } else if (step === 'confirm-new') {
          if (next === tempPin) {
            startTransition(async () => {
              await saveNewPin(next)
              setEnabled(true)
              if (bioSupported) {
                // Ask or try registering biometrics
                const regOk = await registerBiometrics()
                setBioActive(regOk)
              }
              setSuccessMsg('PIN berhasil dipasang!')
              setTimeout(resetModal, 900)
            })
          } else {
            setErrorMsg('PIN konfirmasi tidak cocok. Coba lagi.')
            setTimeout(() => {
              setInputPin('')
              setStep('enter-new')
              setTempPin('')
            }, 700)
          }
        }
      } else if (modalMode === 'change') {
        if (step === 'enter-current') {
          const ok = await verifyEnteredPin(next)
          if (ok) {
            setInputPin('')
            setStep('enter-new')
          } else {
            setErrorMsg('PIN lama salah.')
            setTimeout(() => setInputPin(''), 400)
          }
        } else if (step === 'enter-new') {
          setTempPin(next)
          setInputPin('')
          setStep('confirm-new')
        } else if (step === 'confirm-new') {
          if (next === tempPin) {
            startTransition(async () => {
              await saveNewPin(next)
              setSuccessMsg('PIN berhasil diperbarui!')
              setTimeout(resetModal, 900)
            })
          } else {
            setErrorMsg('PIN konfirmasi tidak cocok.')
            setTimeout(() => {
              setInputPin('')
              setStep('enter-new')
              setTempPin('')
            }, 700)
          }
        }
      }
    }
  }

  const handleToggleBiometrics = async () => {
    if (!enabled) return
    if (bioActive) {
      setBiometricsEnabled(false)
      setBioActive(false)
    } else {
      const ok = await registerBiometrics()
      setBioActive(ok)
    }
  }

  return (
    <div className="surface-card rounded-3xl p-5 sm:p-6 mb-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="icon-tile text-accent">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-text-primary">Kunci PIN & Biometrik</h2>
            <p className="text-sm text-text-secondary">
              {enabled
                ? 'Aplikasi terkunci dengan aman saat dibuka.'
                : 'Minta PIN atau sidik jari setiap kali aplikasi dibuka.'}
            </p>
          </div>
        </div>

        <div>
          {enabled ? (
            <span className="status-pill">Aktif</span>
          ) : (
            <button
              type="button"
              onClick={handleSetupClick}
              className="primary-button text-xs !min-h-10 px-3.5"
            >
              Pasang PIN
            </button>
          )}
        </div>
      </div>

      {enabled && (
        <div className="mt-5 divide-y divide-border-inner border-t border-border-inner pt-2">
          {/* Change PIN */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5 text-sm">
              <KeyRound className="h-4 w-4 text-accent" />
              <span>Ganti PIN 6 Digit</span>
            </div>
            <button
              type="button"
              onClick={handleChangePinClick}
              className="rounded-xl border border-border-outer px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              Ubah
            </button>
          </div>

          {/* Biometrics Toggle if supported */}
          {bioSupported && (
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5 text-sm">
                <Fingerprint className="h-4 w-4 text-accent" />
                <div>
                  <p>Buka dengan Sidik Jari / FaceID</p>
                  <p className="text-xs text-text-secondary">Akses cepat tanpa ketik PIN</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleBiometrics}
                className={`flex h-6 w-11 items-center rounded-full p-1 transition-colors ${
                  bioActive ? 'bg-accent justify-end' : 'bg-white/15 justify-start'
                }`}
                aria-label="Toggle Biometrik"
              >
                <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          )}

          {/* Disable Lock */}
          <div className="flex items-center justify-between py-3">
            <span className="text-xs text-text-secondary">Nonaktifkan kunci keamanan</span>
            <button
              type="button"
              onClick={handleDisableClick}
              className="text-xs font-semibold text-danger hover:underline"
            >
              Matikan
            </button>
          </div>
        </div>
      )}

      {/* Modal Dialog for PIN Setup / Verification */}
      {modalMode !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
          <div className="surface-card w-full max-w-xs rounded-3xl p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {modalMode === 'disable'
                  ? 'Konfirmasi Matikan Kunci'
                  : modalMode === 'setup'
                  ? step === 'enter-new'
                    ? 'Buat 6 Digit PIN'
                    : 'Konfirmasi PIN'
                  : step === 'enter-current'
                  ? 'Masukkan PIN Lama'
                  : step === 'enter-new'
                  ? 'Buat PIN Baru'
                  : 'Konfirmasi PIN Baru'}
              </h3>
              <button
                type="button"
                onClick={resetModal}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              {step === 'enter-current'
                ? 'Ketikkan PIN saat ini untuk verifikasi.'
                : step === 'enter-new'
                ? 'Pilih 6 angka rahasia yang mudah Anda ingat.'
                : 'Ketik ulang 6 digit PIN yang sama.'}
            </p>

            {/* PIN Dots */}
            <div className="my-6 flex justify-center gap-3.5">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`h-3.5 w-3.5 rounded-full transition-all ${
                    inputPin.length > idx
                      ? 'scale-125 bg-accent shadow-[0_0_10px_rgba(79,127,232,0.8)]'
                      : 'border border-border-outer bg-white/[0.05]'
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <p className="mb-4 text-center text-xs font-medium text-danger" role="alert">
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <p className="mb-4 flex items-center justify-center gap-1.5 text-xs font-medium text-accent-income">
                <Check className="h-4 w-4" /> {successMsg}
              </p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleKeyTap(digit)}
                  className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl border border-border-outer bg-surface text-base font-semibold transition hover:border-accent/40 active:scale-95 disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleKeyTap('0')}
                className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl border border-border-outer bg-surface text-base font-semibold transition hover:border-accent/40 active:scale-95 disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setInputPin((p) => p.slice(0, -1))}
                className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl text-xs text-text-secondary hover:text-text-primary active:scale-95"
              >
                Hapus
              </button>
            </div>

            {isPending && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-accent">
                <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
