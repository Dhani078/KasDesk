/**
 * Shown when a screen has no data yet. Keeps the layout from collapsing and
 * tells the user what to do next instead of showing a blank void.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-outer bg-surface/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-text-secondary">{icon}</div>}
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {body && <p className="mt-1 max-w-xs text-xs text-text-secondary">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
