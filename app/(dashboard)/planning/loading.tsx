function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />
}

export default function PlanningLoading() {
  return (
    <main className="page-shell max-w-3xl" aria-busy="true" aria-label="Memuat budget dan pengingat">
      <SkeletonBlock className="h-11 w-32" />
      <header className="page-header"><div className="w-full space-y-3"><SkeletonBlock className="h-3 w-20" /><SkeletonBlock className="h-10 w-72" /><SkeletonBlock className="h-5 w-full max-w-md" /></div><SkeletonBlock className="h-11 w-11 rounded-xl" /></header>
      <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3"><SkeletonBlock className="h-24" /><SkeletonBlock className="h-24" /><SkeletonBlock className="col-span-2 h-24 sm:col-span-1" /></section>
      <SkeletonBlock className="mb-4 h-40 w-full" />
      <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-32" />)}</div>
    </main>
  )
}
