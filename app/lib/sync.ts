import { prisma } from './prisma'
import { fetchFifaMatches, FifaTeam, mapStageName, KNOCKOUT_STAGES } from './fifa'
import { MatchWinner } from '@prisma/client'
import { calculatePoints } from './scoring'

async function upsertTeam(fifaTeam: FifaTeam) {
  return prisma.team.upsert({
    where: { fifaId: fifaTeam.IdTeam },
    create: {
      fifaId: fifaTeam.IdTeam,
      name: fifaTeam.TeamName[0]?.Description || fifaTeam.IdTeam,
      code: fifaTeam.Abbreviation,
      flagUrl: fifaTeam.PictureUrl,
    },
    update: {
      name: fifaTeam.TeamName[0]?.Description || fifaTeam.IdTeam,
      code: fifaTeam.Abbreviation,
      flagUrl: fifaTeam.PictureUrl,
    },
  })
}

function determineWinner(match: {
  Winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  HomeTeamScore: number | null
  AwayTeamScore: number | null
  HomeTeamPenaltyScore: number | null
  AwayTeamPenaltyScore: number | null
}): MatchWinner | null {
  if (match.Winner === 'HOME_TEAM') return 'HOME'
  if (match.Winner === 'AWAY_TEAM') return 'AWAY'

  if (match.HomeTeamScore !== null && match.AwayTeamScore !== null) {
    if (match.HomeTeamScore > match.AwayTeamScore) return 'HOME'
    if (match.HomeTeamScore < match.AwayTeamScore) return 'AWAY'

    // Tied after regular/extra time: decide by penalties if available.
    if (
      match.HomeTeamPenaltyScore !== null &&
      match.AwayTeamPenaltyScore !== null
    ) {
      if (match.HomeTeamPenaltyScore > match.AwayTeamPenaltyScore) return 'HOME'
      if (match.HomeTeamPenaltyScore < match.AwayTeamPenaltyScore) return 'AWAY'
    }

    return 'DRAW'
  }

  return null
}

async function recalculatePoints() {
  const predictions = await prisma.prediction.findMany({
    include: { match: true },
  })

  for (const pred of predictions) {
    if (!pred.match.winner) {
      if (pred.pointsEarned !== 0) {
        await prisma.prediction.update({
          where: { id: pred.id },
          data: { pointsEarned: 0 },
        })
      }
      continue
    }

    const points = calculatePoints(
      pred.predictedWinner,
      pred.match.winner
    )

    if (points !== pred.pointsEarned) {
      await prisma.prediction.update({
        where: { id: pred.id },
        data: { pointsEarned: points },
      })
    }
  }
}

async function upsertMatch(data: {
  fifaMatchId: string
  stage: string
  matchNumber: number
  roundOrder: number
  utcDate: Date
  localDate: Date
  status: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  homePenaltyScore: number | null
  awayPenaltyScore: number | null
  winner: MatchWinner | null
  placeholderA: string | null
  placeholderB: string | null
  stadiumName: string | null
}) {
  const existing = await prisma.match.findUnique({
    where: { fifaMatchId: data.fifaMatchId },
  })

  if (existing) {
    return prisma.match.update({
      where: { id: existing.id },
      data,
    })
  }

  try {
    return await prisma.match.create({ data })
  } catch (error) {
    // Race condition: another worker created the match between find and create.
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      const retry = await prisma.match.findUnique({
        where: { fifaMatchId: data.fifaMatchId },
      })
      if (retry) {
        return prisma.match.update({ where: { id: retry.id }, data })
      }
    }
    throw error
  }
}

export async function syncMatches() {
  const fifaMatches = await fetchFifaMatches()

  // Only keep knockout stage matches (Round of 32 through Final)
  const knockoutMatches = fifaMatches.filter((fm) => {
    const stage = mapStageName(fm.StageName[0]?.Description || '')
    return KNOCKOUT_STAGES.includes(stage)
  })

  for (const fm of knockoutMatches) {
    const homeTeam = fm.Home ? await upsertTeam(fm.Home) : null
    const awayTeam = fm.Away ? await upsertTeam(fm.Away) : null
    const apiWinner = determineWinner(fm)

    const matchData = {
      fifaMatchId: fm.IdMatch,
      stage: mapStageName(fm.StageName[0]?.Description || ''),
      matchNumber: fm.MatchNumber,
      roundOrder: fm.MatchNumber,
      utcDate: new Date(fm.Date),
      localDate: new Date(fm.LocalDate),
      status: String(fm.MatchStatus),
      homeTeamId: fm.Home ? homeTeam?.id ?? null : null,
      awayTeamId: fm.Away ? awayTeam?.id ?? null : null,
      homeScore: fm.HomeTeamScore ?? null,
      awayScore: fm.AwayTeamScore ?? null,
      homePenaltyScore: fm.HomeTeamPenaltyScore ?? null,
      awayPenaltyScore: fm.AwayTeamPenaltyScore ?? null,
      winner: apiWinner,
      placeholderA: fm.PlaceHolderA,
      placeholderB: fm.PlaceHolderB,
      stadiumName: fm.Stadium?.Name[0]?.Description || null,
    }

    await upsertMatch(matchData)
  }

  await recalculatePoints()
}
