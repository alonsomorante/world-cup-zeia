import { syncMatches } from '@/app/lib/sync'
import { prisma } from '@/app/lib/prisma'
import AppHeader from '@/app/components/AppHeader'
import BracketView from '@/app/components/BracketView'

export const dynamic = 'force-dynamic'

export default async function BracketPage() {
  try {
    await syncMatches()
  } catch (error) {
    console.error('Failed to sync on bracket page:', error)
  }

  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: [{ matchNumber: 'asc' }],
  })

  return (
    <div className="min-h-screen bg-[#f7f3e8]">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-28">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-[#1a1a1a] mb-2">Bracket del Mundial</h1>
          <p className="text-[#4a4539] text-lg">Así quedaron los cruces del Mundial 2026</p>
        </div>

        <BracketView matches={matches} />
      </main>
    </div>
  )
}
