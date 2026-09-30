'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function PrivacyToggle() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const checkState = () => {
      const v = typeof document !== 'undefined'
        ? document.documentElement.classList.contains('privacy-mode')
        : localStorage.getItem('kasdesk:privacy') === 'hidden'
      setHidden(v)
    }

    const v = localStorage.getItem('kasdesk:privacy') === 'hidden'
    document.documentElement.classList.toggle('privacy-mode', v)
    requestAnimationFrame(() => setHidden(v))

    window.addEventListener('kasdesk:privacy-changed', checkState)
    return () => window.removeEventListener('kasdesk:privacy-changed', checkState)
  }, [])

  function toggle() {
    setHidden((prev) => {
      const n = !prev
      document.documentElement.classList.toggle('privacy-mode', n)
      localStorage.setItem('kasdesk:privacy', n ? 'hidden' : 'shown')
      window.dispatchEvent(new CustomEvent('kasdesk:privacy-changed'))
      return n
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
      title={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
      className="grid h-11 w-11 place-items-center rounded-xl border border-border-outer bg-surface text-text-secondary transition hover:text-text-primary active:scale-95 cursor-pointer"
    >
      {hidden ? <EyeOff className="h-4 w-4 text-accent" /> : <Eye className="h-4 w-4" />}
    </button>
  )
}
