import Link from 'next/link'

/**
 * Shown when a screen has no data yet. Keeps the layout from collapsing and
 * tells the user what to do next instead of showing a blank void.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  actionHref,
  actionLabel,
}: {
  icon?: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-border-outer bg-surface/55 px-6 py-12 text-center">
      <div className="pointer-events-none absolute inset-x-8 -top-20 h-40 rounded-full bg-accent/10 blur-3xl" aria-hidden />
      <div className="relative flex flex-col items-center justify-center">
        {icon && (
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/15">
            {icon}
          </div>
        )}
        <p className="text-base font-semibold text-text-primary">{title}</p>
        {body && <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">{body}</p>}
        {action ?? (actionHref && actionLabel ? <Link href={actionHref} className="primary-button mt-5">{actionLabel}</Link> : null)}
      </div>
    </div>
  )
}
