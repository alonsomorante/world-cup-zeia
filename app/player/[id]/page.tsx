import { notFound } from 'next/navigation'
import Image from 'next/image'
import { syncMatches } from '@/app/lib/sync'
import { prisma } from '@/app/lib/prisma'
import AppHeader from '@/app/components/AppHeader'
import PredictionGrid from '@/app/components/PredictionGrid'
import PredictionBracket from '@/app/components/PredictionBracket'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PlayerPage({ params }: PageProps) {
  const { id } = await params

  try {
    await syncMatches()
  } catch (error) {
    console.error('Failed to sync on player page:', error)
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      predictions: {
        include: {
          match: {
            include: {
              homeTeam: true,
              awayTeam: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  const totalPoints = user.predictions.reduce((sum, p) => sum + p.pointsEarned, 0)
  const winners = user.predictions.filter((p) => p.pointsEarned >= 1).length

  return (
    <div className="min-h-screen bg-[#f7f3e8]">
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-28">
        <div className="bg-white rounded-2xl border-2 border-[#1a5f2a] p-6 mb-6 shadow-[0_4px_0_rgba(0,0,0,0.06)] flex items-center gap-5">
          {user.imageUrl ? (
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-[#ffd700] shadow-md">
              <Image src={user.imageUrl} alt={user.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#1a5f2a] flex items-center justify-center text-white font-display text-3xl border-4 border-[#ffd700]">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-4xl text-[#1a1a1a]">{user.name}</h1>
            <p className="text-[#4a4539] text-lg">
              <span className="font-display text-2xl text-[#1a5f2a]">{totalPoints}</span> puntos ·{' '}
              <span className="font-display text-2xl text-[#1a5f2a]">{winners}</span> aciertos
            </p>
          </div>
        </div>

        <div className="mb-6 bg-white rounded-2xl border-2 border-[#efe9d8] p-5 shadow-[0_4px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-display text-2xl text-[#1a5f2a] uppercase tracking-wide mb-4">
            Historial de predicciones
          </h2>
          <PredictionGrid predictions={user.predictions} />
        </div>

        <div className="bg-white rounded-2xl border-2 border-[#efe9d8] p-5 shadow-[0_4px_0_rgba(0,0,0,0.05)]">
          <h2 className="font-display text-2xl text-[#1a5f2a] uppercase tracking-wide mb-4">
            Bracket de predicciones
          </h2>
          <PredictionBracket predictions={user.predictions} />
        </div>
      </main>
    </div>
  )
}
