function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />
}

export default function CoachLoading() {
  return <main className="page-shell max-w-3xl" aria-busy="true" aria-label="Memuat coach keuangan"><SkeletonBlock className="h-11 w-32" /><header className="page-header"><div className="w-full space-y-3"><SkeletonBlock className="h-3 w-20" /><SkeletonBlock className="h-10 w-64" /><SkeletonBlock className="h-5 w-full max-w-md" /></div><SkeletonBlock className="h-11 w-11 rounded-xl" /></header><SkeletonBlock className="mb-6 h-32 w-full" /><div className="grid gap-3 sm:grid-cols-2">{[0,1,2,3,4,5].map((item)=><SkeletonBlock key={item} className="h-40" />)}</div></main>
}
