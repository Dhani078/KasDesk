function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />
}

export default function DashboardLoading() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12" aria-busy="true" aria-label="Memuat dashboard">
      <header className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-5 w-36" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-11 w-11 rounded-xl" />
            <SkeletonBlock className="h-11 w-11 rounded-xl" />
            <SkeletonBlock className="h-11 w-11 rounded-xl" />
          </div>
        </div>
        <section className="surface-card rounded-3xl border border-border-outer p-5 shadow-sm">
          <SkeletonBlock className="mb-3 h-3 w-28" />
          <div className="flex items-end justify-between gap-4">
            <SkeletonBlock className="h-10 w-52" />
            <SkeletonBlock className="h-7 w-20 rounded-full" />
          </div>
        </section>
      </header>

      <section className="mb-6">
        <div className="mb-3 flex justify-between">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-3 w-14" />
        </div>
        <div className="-mx-5 flex gap-3 overflow-hidden px-5 py-1">
          {[0, 1, 2].map((item) => <SkeletonBlock key={item} className="h-16 w-40 shrink-0" />)}
        </div>
      </section>

      <SkeletonBlock className="mb-6 h-28 w-full" />
      <section className="mb-6 grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
      </section>
      <section className="space-y-3">
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-20" />
          <SkeletonBlock className="h-4 w-28" />
        </div>
        {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-16 w-full" />)}
      </section>
    </main>
  )
}
