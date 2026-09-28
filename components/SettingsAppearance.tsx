'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, Moon, Sun } from 'lucide-react'

export function SettingsAppearance() {
  const [privacyHidden, setPrivacyHidden] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const isPrivacy = localStorage.getItem('kasdesk:privacy') === 'hidden'
      setPrivacyHidden(isPrivacy)

      const savedTheme = localStorage.getItem('kasdesk:theme') as 'dark' | 'light' | null
      const isLight = savedTheme === 'light'
      setTheme(isLight ? 'light' : 'dark')
    })

    const onPrivacyChanged = () => {
      setPrivacyHidden(document.documentElement.classList.contains('privacy-mode'))
    }
    const onThemeChanged = () => {
      setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    }

    window.addEventListener('kasdesk:privacy-changed', onPrivacyChanged)
    window.addEventListener('kasdesk:theme-changed', onThemeChanged)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('kasdesk:privacy-changed', onPrivacyChanged)
      window.removeEventListener('kasdesk:theme-changed', onThemeChanged)
    }
  }, [])

  function togglePrivacy() {
    const next = !privacyHidden
    setPrivacyHidden(next)
    document.documentElement.classList.toggle('privacy-mode', next)
    localStorage.setItem('kasdesk:privacy', next ? 'hidden' : 'shown')
    window.dispatchEvent(new CustomEvent('kasdesk:privacy-changed'))
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.documentElement.dataset.theme = 'light'
    } else {
      delete document.documentElement.dataset.theme
    }
    localStorage.setItem('kasdesk:theme', next)
    window.dispatchEvent(new CustomEvent('kasdesk:theme-changed'))
  }

  return (
    <div className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl">
      {/* Privacy Mode Row */}
      <button
        type="button"
        onClick={togglePrivacy}
        className="setting-row group w-full text-left transition hover:bg-white/[0.03] active:scale-[0.99] flex items-center justify-between gap-4 cursor-pointer"
        aria-pressed={privacyHidden}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <span className={`icon-tile transition-colors ${privacyHidden ? 'bg-accent/15 text-accent' : 'text-text-secondary group-hover:text-text-primary'}`}>
            {privacyHidden ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-text-primary text-sm">Sembunyikan nominal (Mode Privasi)</p>
            <p className="text-xs text-text-secondary mt-0.5">Nominal disamarkan menjadi Rp •••••• agar aman di tempat umum.</p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            privacyHidden ? 'bg-accent-solid' : 'bg-white/[0.12]'
          }`}
          aria-hidden="true"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              privacyHidden ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </button>

      {/* Theme Toggle Row */}
      <button
        type="button"
        onClick={toggleTheme}
        className="setting-row group w-full text-left transition hover:bg-white/[0.03] active:scale-[0.99] flex items-center justify-between gap-4 cursor-pointer"
        aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <span className="icon-tile text-text-secondary group-hover:text-text-primary transition-colors">
            {theme === 'dark' ? <Moon className="h-5 w-5" aria-hidden /> : <Sun className="h-5 w-5 text-amber-400" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-text-primary text-sm">Tema aplikasi</p>
            <p className="text-xs text-text-secondary mt-0.5">Beralih antara mode gelap (default) dan mode terang.</p>
          </div>
        </div>

        {/* Theme badge button */}
        <span className="shrink-0 flex items-center gap-1.5 rounded-full border border-border-outer bg-white/[0.04] px-3 py-1 text-xs font-semibold text-text-primary transition group-hover:border-accent/40">
          {theme === 'dark' ? (
            <>
              <Moon className="h-3.5 w-3.5 text-accent" /> Mode Gelap
            </>
          ) : (
            <>
              <Sun className="h-3.5 w-3.5 text-amber-400" /> Mode Terang
            </>
          )}
        </span>
      </button>
    </div>
  )
}
