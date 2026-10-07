export function QuickLogSuccessView() {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="animate-success-pop grid h-14 w-14 place-items-center rounded-full bg-accent-income/15">
        <svg className="h-7 w-7 text-accent-income" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <p className="animate-fade-in-up text-sm font-semibold text-accent-income">Tersimpan!</p>
    </div>
  )
}
