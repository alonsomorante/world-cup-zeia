'use client'

import Image from 'next/image'
import { Prediction, Match, Team, MatchWinner } from '@prisma/client'
import { getFlagUrl } from '@/app/lib/flags'

type MatchWithTeams = Match & {
  homeTeam: Team | null
  awayTeam: Team | null
}

type PredictionWithMatch = Prediction & {
  match: MatchWithTeams
}

const STAGE_LABELS: Record<string, string> = {
  ROUND_OF_32: '16avos de final',
  ROUND_OF_16: 'Octavos de final',
  QUARTER_FINAL: 'Cuartos de final',
  SEMI_FINAL: 'Semifinales',
  THIRD_PLACE: '3er puesto',
  FINAL: 'Final',
}

function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function winnerLabel(match: MatchWithTeams): string {
  if (!match.winner) return ''
  if (match.winner === 'DRAW') return 'Empate'
  const team = match.winner === 'HOME' ? match.homeTeam : match.awayTeam
  return team?.name || match.winner
}

function predictedWinnerLabel(
  match: MatchWithTeams,
  predictedWinner: MatchWinner
): string {
  if (predictedWinner === 'DRAW') return 'Empate'
  const team = predictedWinner === 'HOME' ? match.homeTeam : match.awayTeam
  return team?.name || predictedWinner
}

function StatusBadge({ points, hasResult }: { points: number; hasResult: boolean }) {
  if (!hasResult) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-display uppercase tracking-wide bg-[#efe9d8] text-[#4a4539]">
        Pendiente
      </span>
    )
  }

  if (points > 0) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-display uppercase tracking-wide bg-[#1a5f2a] text-white">
        +{points} pt
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-display uppercase tracking-wide bg-[#d93025] text-white">
      Falló
    </span>
  )
}

function TeamBox({
  team,
  placeholder,
  isPredicted,
  isActual,
}: {
  team?: Team | null
  placeholder?: string | null
  isPredicted?: boolean
  isActual?: boolean
}) {
  const name = team?.name || placeholder || 'TBD'
  const flag = getFlagUrl(team?.code)

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 ${
        isActual
          ? 'border-[#1a5f2a] bg-[#1a5f2a]/10'
          : isPredicted
          ? 'border-[#d4af37] bg-[#ffd700]/15'
          : 'border-[#efe9d8] bg-white'
      }`}
    >
      {flag ? (
        <Image
          src={flag}
          alt={name}
          width={48}
          height={32}
          className="object-cover rounded-md w-14 h-9 shadow-sm"
        />
      ) : (
        <div className="w-14 h-9 rounded-md bg-[#f7f3e8] border-2 border-dashed border-[#efe9d8]" />
      )}
      <span
        className={`text-sm font-semibold text-center leading-tight ${
          isActual ? 'text-[#1a5f2a]' : isPredicted ? 'text-[#1a1a1a]' : 'text-[#4a4539]'
        }`}
      >
        {name}
      </span>
    </div>
  )
}

export default function PredictionGrid({
  predictions,
}: {
  predictions: PredictionWithMatch[]
}) {
  const sorted = [...predictions].sort(
    (a, b) => new Date(a.match.utcDate).getTime() - new Date(b.match.utcDate).getTime()
  )

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sorted.map((pred) => {
        const match = pred.match
        const hasResult = match.winner !== null
        const actualWinner = match.winner
        const predictedWinner = pred.predictedWinner

        return (
          <div
            key={pred.id}
            className="bg-white rounded-2xl border-2 border-[#efe9d8] p-5 shadow-[0_3px_0_rgba(0,0,0,0.05)]"
          >
            <div className="flex items-center justify-between text-sm text-[#4a4539] mb-3">
              <span className="font-display uppercase tracking-wide">{STAGE_LABELS[match.stage] || match.stage}</span>
              <span>{formatDate(match.utcDate)}</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <TeamBox
                team={match.homeTeam}
                placeholder={match.placeholderA}
                isPredicted={predictedWinner === 'HOME'}
                isActual={actualWinner === 'HOME'}
              />
              <span className="text-[#4a4539] font-display text-lg">VS</span>
              <TeamBox
                team={match.awayTeam}
                placeholder={match.placeholderB}
                isPredicted={predictedWinner === 'AWAY'}
                isActual={actualWinner === 'AWAY'}
              />
            </div>

            <div className="mt-4 text-center">
              <p className="text-[#4a4539]">
                Predicción:{' '}
                <span className="font-semibold text-[#1a1a1a]">
                  {predictedWinnerLabel(match, predictedWinner)}
                </span>
              </p>
              {hasResult && (
                <p className="text-sm text-[#4a4539] mt-1">
                  Resultado real:{' '}
                  <span className="font-semibold text-[#1a5f2a]">{winnerLabel(match)}</span>
                  {' '}({match.homeScore} - {match.awayScore})
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-center">
              <StatusBadge points={pred.pointsEarned} hasResult={hasResult} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
