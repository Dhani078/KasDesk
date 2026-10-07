export function QuickLogTypeSelector({
  txType,
  onChange,
}: {
  txType: 'expense' | 'income' | 'transfer'
  onChange: (type: 'expense' | 'income' | 'transfer') => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(['expense', 'income', 'transfer'] as const).map((t) => (
        <label key={t} className="cursor-pointer">
          <input
            type="radio"
            name="type"
            value={t}
            checked={txType === t}
            onChange={() => onChange(t)}
            className="peer sr-only"
          />
          <span
            className={`block rounded-xl border px-2 py-2 text-center text-xs capitalize transition ${
              txType === t
                ? 'border-accent bg-accent/15 font-semibold text-accent'
                : 'border-border-outer text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'expense' ? 'Keluar' : t === 'income' ? 'Masuk' : 'Transfer'}
          </span>
        </label>
      ))}
    </div>
  )
}
