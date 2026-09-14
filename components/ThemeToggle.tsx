'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('kasdesk:theme') as 'dark' | 'light' | null
    // KasDesk defaults to dark mode. Only switch to light if explicitly set by the user.
    const v = saved === 'light' ? 'light' : 'dark'
    if (v === 'light') {
      document.documentElement.dataset.theme = 'light'
    } else {
      delete document.documentElement.dataset.theme
    }
    requestAnimationFrame(() => setTheme(v))
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.documentElement.dataset.theme = 'light'
    } else {
      delete document.documentElement.dataset.theme
    }
    localStorage.setItem('kasdesk:theme', next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      title={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      className="grid h-11 w-11 place-items-center rounded-xl border border-border-outer bg-surface text-text-secondary transition hover:text-text-primary active:scale-95"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
