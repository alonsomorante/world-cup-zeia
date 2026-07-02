'use client'

import { Prediction, MatchWinner } from '@prisma/client'
import BracketView, { MatchWithTeams } from './BracketView'

type PredictionWithMatch = Prediction & {
  match: MatchWithTeams
}

function predictedWinnerLabel(
  match: MatchWithTeams,
  predictedWinner: MatchWinner
): string {
  if (predictedWinner === 'DRAW') return 'Empate'
  const team = predictedWinner === 'HOME' ? match.homeTeam : match.awayTeam
  return team?.name || predictedWinner
}

export default function PredictionBracket({
  predictions,
}: {
  predictions: PredictionWithMatch[]
}) {
  const predictionMap = new Map<string, PredictionWithMatch>()
  for (const pred of predictions) {
    predictionMap.set(pred.matchId, pred)
  }

  const allMatches = predictions.map((p) => p.match)

  return (
    <BracketView
      matches={allMatches}
      renderExtra={(match: MatchWithTeams) => {
        const pred = predictionMap.get(match.id)
        if (!pred) return null

        const hasResult = match.winner !== null
        const isHit = hasResult && pred.pointsEarned > 0
        const isMiss = hasResult && pred.pointsEarned === 0

        return (
          <div className="text-xs text-center">
            <div className="text-[#4a4539]">
              Predicción:{' '}
              <span className="font-semibold text-[#1a1a1a]">
                {predictedWinnerLabel(match, pred.predictedWinner)}
              </span>
            </div>
            {hasResult && (
              <div
                className={`mt-1 font-display uppercase tracking-wide ${
                  isHit ? 'text-[#1a5f2a]' : isMiss ? 'text-[#d93025]' : 'text-[#4a4539]'
                }`}
              >
                {isHit ? `+${pred.pointsEarned} pt` : 'Falló'}
              </div>
            )}
          </div>
        )
      }}
    />
  )
}
