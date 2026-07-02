'use client'

import Link from 'next/link'

export default function AppHeader({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <header className="bg-white border-b-4 border-[#1a5f2a] sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1a5f2a] flex items-center justify-center text-white font-display text-xl border-2 border-[#ffd700]">
            26
          </div>
          <span className="font-display text-2xl text-[#1a1a1a] tracking-wide">
            QUINIELA MUNDIAL
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg font-display uppercase tracking-wide text-[#4a4539] hover:bg-[#f7f3e8] hover:text-[#1a5f2a] transition-colors"
          >
            Ranking
          </Link>
          <Link
            href="/bracket"
            className="px-4 py-2 rounded-lg font-display uppercase tracking-wide text-[#4a4539] hover:bg-[#f7f3e8] hover:text-[#1a5f2a] transition-colors"
          >
            Bracket
          </Link>
          <Link
            href="/admin"
            className={`px-4 py-2 rounded-lg font-display uppercase tracking-wide transition-colors ${
              isAdmin
                ? 'bg-[#1a5f2a] text-white'
                : 'text-[#4a4539] hover:bg-[#f7f3e8] hover:text-[#1a5f2a]'
            }`}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  )
}
