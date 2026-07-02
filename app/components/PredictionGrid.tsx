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
    return <span className="badge badge-pending">Pendiente</span>
  }

  if (points > 0) {
    return <span className="badge badge-hit">+{points} pt</span>
  }

  return <span className="badge badge-miss">Falló</span>
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
      className={`flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border p-4 ${
        isActual
          ? 'border-accent bg-accent-light/50'
          : isPredicted
          ? 'border-slate-900 bg-slate-100'
          : 'border-slate-200 bg-white'
      }`}
    >
      {flag ? (
        <Image
          src={flag}
          alt={name}
          width={48}
          height={32}
          className="object-cover rounded-md w-12 h-8 shadow-sm"
        />
      ) : (
        <div className="w-12 h-8 rounded-md bg-slate-100 border border-dashed border-slate-300" />
      )}
      <span
        className={`text-xs sm:text-sm font-semibold text-center leading-tight ${
          isActual ? 'text-accent-dark' : isPredicted ? 'text-slate-900' : 'text-slate-500'
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
      {sorted.map((pred, index) => {
        const match = pred.match
        const hasResult = match.winner !== null
        const actualWinner = match.winner
        const predictedWinner = pred.predictedWinner

        return (
          <div
            key={pred.id}
            className="surface p-5 animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              <span>{STAGE_LABELS[match.stage] || match.stage}</span>
              <span>{formatDate(match.utcDate)}</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <TeamBox
                team={match.homeTeam}
                placeholder={match.placeholderA}
                isPredicted={predictedWinner === 'HOME'}
                isActual={actualWinner === 'HOME'}
              />
              <span className="text-slate-400 font-display font-bold text-sm">VS</span>
              <TeamBox
                team={match.awayTeam}
                placeholder={match.placeholderB}
                isPredicted={predictedWinner === 'AWAY'}
                isActual={actualWinner === 'AWAY'}
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm">
                <span className="text-slate-500">Predicción:</span>{' '}
                <span className="font-semibold text-slate-900">
                  {predictedWinnerLabel(match, predictedWinner)}
                </span>
              </div>
              <StatusBadge points={pred.pointsEarned} hasResult={hasResult} />
            </div>

            {hasResult && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">
                Resultado:{' '}
                <span className="font-semibold text-slate-900">
                  {winnerLabel(match)} ({match.homeScore} - {match.awayScore}
                  {match.homePenaltyScore !== null && match.awayPenaltyScore !== null && (
                    <span className="text-slate-400"> · penales {match.homePenaltyScore}-{match.awayPenaltyScore}</span>
                  )})
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
