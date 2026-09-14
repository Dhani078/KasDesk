function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />
}

export default function TransactionsLoading() {
  return (
    <main className="page-shell max-w-3xl" aria-busy="true" aria-label="Memuat transaksi">
      <SkeletonBlock className="h-11 w-32" />
      <header className="page-header">
        <div className="w-full space-y-3">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-10 w-64" />
          <SkeletonBlock className="h-5 w-full max-w-md" />
        </div>
      </header>
      <section className="surface-card rounded-3xl p-5 sm:p-6">
        <SkeletonBlock className="mb-5 h-5 w-36" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonBlock className="h-12 sm:col-span-2" />
          {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-12" />)}
        </div>
      </section>
      <div className="mb-3 mt-7 flex justify-between">
        <SkeletonBlock className="h-5 w-16" />
        <SkeletonBlock className="h-7 w-24 rounded-full" />
      </div>
      {[0, 1, 2, 3, 4].map((item) => <SkeletonBlock key={item} className="mb-2 h-16 w-full" />)}
    </main>
  )
}
