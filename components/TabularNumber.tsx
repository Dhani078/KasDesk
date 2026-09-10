import { clsx } from 'clsx'

/**
 * Numbers must use tabular figures so digits align vertically in lists.
 * The design system marks this non-negotiable (§2.2) — without it, amounts
 * jitter as you scroll.
 */
export function TabularNumber({
  value,
  className,
}: {
  value: string | number
  className?: string
}) {
  return (
    <span className={clsx('tabular-nums', 'font-mono', className)}>
      {value}
    </span>
  )
}
