export function MetricCard({
  label,
  value,
  tone = 'default',
  icon,
  helper,
}: {
  label: string
  value: string
  tone?: 'default' | 'good' | 'bad' | 'accent'
  icon?: React.ReactNode
  helper?: string
}) {
  const toneClass = tone === 'good' ? 'text-accent-income' : tone === 'bad' ? 'text-accent-expense' : tone === 'accent' ? 'text-accent' : 'text-text-primary'
  return (
    <article className="surface-card rounded-2xl p-5">
      <div className="mb-2 flex items-center gap-1.5 text-text-secondary">
        {icon}
        <span className="text-xs uppercase tracking-[0.06em]">{label}</span>
      </div>
      <p className={`font-mono text-lg font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {helper && <p className="mt-1 text-xs leading-5 text-text-secondary">{helper}</p>}
    </article>
  )
}
