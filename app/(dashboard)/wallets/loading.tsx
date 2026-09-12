function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />
}

export default function WalletsLoading() {
  return (
    <main className="min-h-dvh px-5 pb-32 pt-8" aria-busy="true" aria-label="Memuat dompet">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <SkeletonBlock className="h-10 w-48" />
        <SkeletonBlock className="h-28 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-32" />)}
        </div>
      </div>
    </main>
  )
}
