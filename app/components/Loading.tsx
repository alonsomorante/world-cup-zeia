export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse" />
            <div className="flex flex-col gap-1.5">
              <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
              <div className="w-16 h-2.5 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-20 h-8 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-20 h-8 bg-slate-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 pb-28">
        <div className="max-w-3xl mx-auto">
          {/* Title skeleton */}
          <div className="mb-8 sm:mb-10 space-y-3">
            <div className="w-64 sm:w-80 h-8 sm:h-10 bg-slate-200 rounded-lg animate-pulse" />
            <div className="w-48 sm:w-64 h-4 bg-slate-200 rounded animate-pulse" />
          </div>

          {/* Card skeleton */}
          <div className="surface p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                <div className="w-11 h-11 rounded-full bg-slate-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-slate-200 rounded animate-pulse" />
                  <div className="w-20 h-3 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="w-10 h-6 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
