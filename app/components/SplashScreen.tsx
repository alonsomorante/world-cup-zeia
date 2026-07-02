'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

function Splash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1400)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
      style={{
        backgroundImage: 'url(/nave.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mb-6" />
        <div className="text-white font-display text-2xl font-bold tracking-wider uppercase">
          Mundial Oficina
        </div>
        <div className="text-white/70 text-sm font-semibold uppercase tracking-[0.2em] mt-2">
          Cargando...
        </div>
      </div>
    </div>
  )
}

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [completedPath, setCompletedPath] = useState<string | null>(null)

  return (
    <>
      {completedPath !== pathname && (
        <Splash key={pathname} onComplete={() => setCompletedPath(pathname)} />
      )}
      {completedPath === pathname && children}
    </>
  )
}
