import { formatAmount } from '@/lib/format'

export function PrivacyAmount({
  value,
  sign,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number | string
  sign?: string
  prefix?: string
  suffix?: string
  className?: string
}) {
  let currencyPrefix = 'Rp '
  let numStr = ''

  if (typeof value === 'number') {
    const n = Math.round(value)
    const isNegative = n < 0
    currencyPrefix = sign ? `${sign}Rp ` : isNegative ? '−Rp ' : 'Rp '
    numStr = formatAmount(Math.abs(n))
  } else {
    // Strings like "Rp 150.000", "+Rp 50.000", "−Rp 20.000", "-Rp 10.000", or "150.000"
    const match = String(value).trim().match(/^([+−\-↔]?\s*Rp\s*)(.+)$/i)
    if (match) {
      currencyPrefix = sign ? `${sign}${match[1].replace(/^[+−\-↔]/, '')}` : match[1]
      numStr = match[2]
    } else {
      numStr = String(value)
      currencyPrefix = sign ? `${sign} ` : ''
    }
  }

  return (
    <span className={className}>
      {prefix && <span>{prefix}</span>}
      <span className="privacy-prefix select-none">{currencyPrefix}</span>
      <span className="privacy-val font-mono">{numStr}</span>
      {suffix && <span>{suffix}</span>}
    </span>
  )
}

