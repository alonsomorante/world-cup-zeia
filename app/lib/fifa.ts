export interface FifaTeam {
  IdTeam: string
  TeamName: { Locale: string; Description: string }[]
  Abbreviation: string
  PictureUrl: string
}

export interface FifaMatch {
  IdMatch: string
  IdStage: string
  StageName: { Locale: string; Description: string }[]
  Date: string
  LocalDate: string
  MatchNumber: number
  MatchStatus: number
  Home: FifaTeam | null
  Away: FifaTeam | null
  HomeTeamScore: number | null
  AwayTeamScore: number | null
  HomeTeamPenaltyScore: number | null
  AwayTeamPenaltyScore: number | null
  Winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  PlaceHolderA: string
  PlaceHolderB: string
  Stadium: {
    Name: { Locale: string; Description: string }[]
  }
}

const FIFA_API_URL =
  'https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023'

export async function fetchFifaMatches(): Promise<FifaMatch[]> {
  const res = await fetch(FIFA_API_URL, { next: { revalidate: 60 } })
  if (!res.ok) {
    throw new Error(`FIFA API responded with ${res.status}`)
  }
  const data = await res.json()
  return data.Results || []
}

export function mapStageName(stageName: string): string {
  const map: Record<string, string> = {
    'First Stage': 'GROUP_STAGE',
    'Round of 32': 'ROUND_OF_32',
    'Round of 16': 'ROUND_OF_16',
    'Quarter-final': 'QUARTER_FINAL',
    'Semi-final': 'SEMI_FINAL',
    'Play-off for third place': 'THIRD_PLACE',
    Final: 'FINAL',
  }
  return map[stageName] || stageName.toUpperCase().replace(/ /g, '_')
}

export const KNOCKOUT_STAGES = [
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
]
