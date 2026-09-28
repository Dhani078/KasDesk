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
    <div className="relative overflow-hidden rounded-3xl border border-dashed border-border-outer bg-surface/60 px-6 py-12 text-center animate-fade-in-up">
      <div className="pointer-events-none absolute inset-x-8 -top-24 h-48 rounded-full bg-accent/10 blur-3xl" aria-hidden />
      
      {/* Decorative background geometry */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-40" aria-hidden>
        <svg className="h-64 w-64 text-accent/[0.08]" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="25" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      </div>

      <div className="relative flex flex-col items-center justify-center">
        {icon && (
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl" aria-hidden />
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-accent/25 bg-gradient-to-br from-surface to-accent/10 text-accent shadow-lg ring-1 ring-white/10">
              {icon}
            </div>
          </div>
        )}
        <p className="text-base font-semibold text-text-primary tracking-tight">{title}</p>
        {body && <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">{body}</p>}
        {action ?? (actionHref && actionLabel ? (
          <Link href={actionHref} className="primary-button mt-5">
            {actionLabel}
          </Link>
        ) : null)}
      </div>
    </div>
  )
}
