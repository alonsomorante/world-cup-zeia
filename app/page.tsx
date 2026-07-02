import { syncMatches } from '@/app/lib/sync'
import { prisma } from '@/app/lib/prisma'
import AppHeader from '@/app/components/AppHeader'
import RankingTable from '@/app/components/RankingTable'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  try {
    await syncMatches()
  } catch (error) {
    console.error('Failed to sync on home page:', error)
  }

  const users = await prisma.user.findMany({
    include: {
      predictions: true,
    },
  })

  const ranking = users
    .map((u) => ({
      id: u.id,
      name: u.name,
      imageUrl: u.imageUrl,
      points: u.predictions.reduce((sum, p) => sum + p.pointsEarned, 0),
      winners: u.predictions.filter((p) => p.pointsEarned >= 1).length,
    }))
    .sort((a, b) => b.points - a.points || b.winners - a.winners)

  return (
    <div className="min-h-screen bg-[#f7f3e8]">
      <AppHeader />

      <main className="max-w-2xl mx-auto px-4 py-8 pb-28">
        <div className="text-center mb-8">
          <div className="inline-block bg-[#1a5f2a] text-white px-4 py-1 rounded-full text-sm font-display uppercase tracking-wider mb-3">
            Mundial 2026
          </div>
          <h1 className="font-display text-5xl text-[#1a1a1a] mb-2">Tabla de Posiciones</h1>
          <p className="text-[#4a4539] text-lg">
            Así van tus compañeros en la quiniela
          </p>
        </div>

        <RankingTable ranking={ranking} />
      </main>
    </div>
  )
}
