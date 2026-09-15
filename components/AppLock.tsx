'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import { Lock, Fingerprint, Delete, ShieldAlert, LogOut, Loader2 } from 'lucide-react'
import {
  isAppLockConfigured,
  isAppSessionUnlocked,
  verifyEnteredPin,
  authenticateBiometrics,
  isBiometricsEnabled,
  removeAppLock,
} from '@/lib/app-lock'
import { logoutAction } from '@/lib/auth/actions'
import { clearOfflineData } from '@/lib/offline/queue'

export function AppLock({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false)
  const [pin, setPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [isPendingLogout, startLogout] = useTransition()

  const unlockApp = () => {
    setIsLocked(false)
    setPin('')
    setErrorMsg('')
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('app-locked')
    }
  }

  const checkLockState = useCallback(() => {
    if (!isAppLockConfigured()) {
      setIsLocked(false)
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('app-locked')
      }
      return
    }
    const unlocked = isAppSessionUnlocked()
    setIsLocked(!unlocked)
    if (unlocked && typeof document !== 'undefined') {
      document.documentElement.classList.remove('app-locked')
    }
    setBioAvailable(isBiometricsEnabled())
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      checkLockState()
    })
    return () => cancelAnimationFrame(frame)
  }, [checkLockState])

  // Optional: Auto prompt biometric on initial lock if enabled
  useEffect(() => {
    if (isLocked && isBiometricsEnabled()) {
      authenticateBiometrics().then((success) => {
        if (success) {
          unlockApp()
        }
      })
    }
  }, [isLocked])

  const triggerVibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern)
      } catch {
        // Ignore devices where vibrate is restricted
      }
    }
  }

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 6) return
    triggerVibrate(15)
    setErrorMsg('')
    const next = pin + num
    setPin(next)

    if (next.length === 6) {
      const ok = await verifyEnteredPin(next)
      if (ok) {
        triggerVibrate([20, 30])
        unlockApp()
      } else {
        triggerVibrate([50, 50, 50])
        setIsShaking(true)
        setErrorMsg('PIN salah. Coba lagi.')
        setTimeout(() => {
          setPin('')
          setIsShaking(false)
        }, 500)
      }
    }
  }

  const handleDelete = () => {
    if (pin.length === 0) return
    triggerVibrate(15)
    setPin(pin.slice(0, -1))
    setErrorMsg('')
  }

  const handleBiometricClick = async () => {
    triggerVibrate(20)
    setErrorMsg('')
    const ok = await authenticateBiometrics()
    if (ok) {
      unlockApp()
    } else {
      setErrorMsg('Autentikasi sidik jari/FaceID gagal.')
    }
  }

  const handleForgotPinLogout = () => {
    startLogout(async () => {
      removeAppLock()
      try {
        await clearOfflineData()
        if (typeof caches !== 'undefined') {
          const names = await caches.keys()
          await Promise.all(names.map((n) => caches.delete(n)))
        }
      } catch {
        // ignore
      }
      await logoutAction()
    })
  }

  return (
    <>
      <div className="app-shell-content">{children}</div>

      {isLocked && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-canvas px-6 py-10 text-text-primary">
      {/* Top Branding */}
      <div className="flex flex-col items-center pt-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border-outer bg-surface shadow-lg">
          <Lock className="h-8 w-8 text-accent" />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">KASDESK</h1>
        <p className="mt-1 text-xs text-text-secondary">Masukkan 6 digit PIN untuk membuka</p>

        {/* 6 PIN Dots */}
        <div className={`mt-8 flex items-center gap-3.5 sm:gap-4 ${isShaking ? 'animate-bounce text-danger' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const filled = pin.length > idx
            return (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full transition-all duration-150 ${
                  filled
                    ? 'scale-125 bg-accent shadow-[0_0_12px_rgba(79,127,232,0.8)]'
                    : 'border border-border-outer bg-white/[0.05]'
                } ${isShaking ? 'border-danger bg-danger/40' : ''}`}
              />
            )
          })}
        </div>

        {errorMsg && (
          <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-danger animate-fade-in" role="alert">
            <ShieldAlert className="h-4 w-4" /> {errorMsg}
          </p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs pb-4">
        <div className="grid grid-cols-3 gap-y-4 text-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border-outer/60 bg-surface/60 text-xl font-semibold transition hover:border-accent/40 active:scale-95 active:bg-white/[0.08]"
            >
              {digit}
            </button>
          ))}

          {/* Biometric trigger button */}
          <div className="flex items-center justify-center">
            {bioAvailable ? (
              <button
                type="button"
                onClick={handleBiometricClick}
                aria-label="Buka dengan sidik jari atau FaceID"
                className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent transition hover:bg-accent/20 active:scale-95"
              >
                <Fingerprint className="h-7 w-7" />
              </button>
            ) : (
              <span />
            )}
          </div>

          {/* 0 */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border-outer/60 bg-surface/60 text-xl font-semibold transition hover:border-accent/40 active:scale-95 active:bg-white/[0.08]"
          >
            0
          </button>

          {/* Backspace */}
          <div className="flex items-center justify-center">
            {pin.length > 0 && (
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Hapus digit"
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-text-secondary transition hover:text-text-primary active:scale-95"
              >
                <Delete className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Forgot PIN / Reset option */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="text-xs text-text-secondary hover:text-accent hover:underline"
          >
            Lupa PIN?
          </button>
        </div>
      </div>

      {/* Forgot PIN Confirmation Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
          <div className="surface-card w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-text-primary">Lupa PIN Aplikasi?</h2>
            <p className="mt-2 text-xs leading-5 text-text-secondary">
              Untuk melindungi privasi data Anda, reset PIN dilakukan dengan keluar dari sesi ini. Anda dapat masuk
              kembali dengan email dan password akun Anda.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="secondary-button flex-1"
                disabled={isPendingLogout}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleForgotPinLogout}
                disabled={isPendingLogout}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-danger px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {isPendingLogout ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {isPendingLogout ? 'Keluar…' : 'Keluar Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
</>
)
}
