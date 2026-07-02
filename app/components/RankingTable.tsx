'use client'

import Image from 'next/image'
import Link from 'next/link'

type RankingItem = {
  id: string
  name: string
  imageUrl: string | null
  points: number
  winners: number
}

export default function RankingTable({ ranking }: { ranking: RankingItem[] }) {
  return (
    <div className="space-y-3">
      {ranking.map((u, index) => {
        const isTop3 = index < 3

        return (
          <Link
            key={u.id}
            href={`/player/${u.id}`}
            className="group flex items-center gap-4 p-3 bg-white rounded-xl border-2 border-[#efe9d8] hover:border-[#1a5f2a] transition-all shadow-[0_3px_0_rgba(0,0,0,0.06)] hover:shadow-[0_5px_0_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
          >
            <div
              className={`w-10 h-10 flex items-center justify-center rounded-full font-display text-xl ${
                isTop3
                  ? 'bg-[#ffd700] text-[#1a1a1a] border-2 border-[#d4af37]'
                  : 'bg-[#efe9d8] text-[#4a4539]'
              }`}
            >
              {index + 1}
            </div>

            {u.imageUrl ? (
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-[#1a5f2a] shrink-0">
                <Image src={u.imageUrl} alt={u.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#1a5f2a] flex items-center justify-center text-white font-display text-2xl shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl text-[#1a1a1a] group-hover:text-[#1a5f2a] transition-colors truncate">
                {u.name}
              </h3>
              <p className="text-sm text-[#4a4539]">
                {u.winners} aciertos
              </p>
            </div>

            <div className="text-right">
              <div className="font-display text-3xl text-[#1a5f2a]">{u.points}</div>
              <div className="text-xs text-[#4a4539] uppercase tracking-wide">pts</div>
            </div>
          </Link>
        )
      })}

      {ranking.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-[#d4af37]">
          <p className="text-[#4a4539] text-lg">Aún no hay predicciones registradas</p>
          <p className="text-[#4a4539] text-sm mt-1">Ve al panel de admin para empezar</p>
        </div>
      )}
    </div>
  )
}
