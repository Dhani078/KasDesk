function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />
}

export default function DebtsLoading() {
  return (
    <main className="min-h-dvh px-5 pb-32 pt-8" aria-busy="true" aria-label="Memuat utang dan piutang">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <SkeletonBlock className="h-10 w-56" />
        <SkeletonBlock className="h-24 w-full" />
        {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-20 w-full" />)}
      </div>
    </main>
  )
}
