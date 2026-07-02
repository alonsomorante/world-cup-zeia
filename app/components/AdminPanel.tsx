'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Match, Team, User, Prediction, MatchWinner } from '@prisma/client'
import { getFlagUrl } from '@/app/lib/flags'
import {
  savePredictions,
  createPlayer,
  deletePrediction,
  logoutAdminAction,
  updateUserImage,
} from '@/app/lib/actions'

type MatchWithTeams = Match & {
  homeTeam: Team | null
  awayTeam: Team | null
}

type PredictionWithMatch = Prediction & {
  match: MatchWithTeams
}

type UserWithPredictions = User & {
  predictions: PredictionWithMatch[]
}

const STAGE_LABELS: Record<string, string> = {
  ROUND_OF_32: '16avos de final',
  ROUND_OF_16: 'Octavos de final',
  QUARTER_FINAL: 'Cuartos de final',
  SEMI_FINAL: 'Semifinales',
  THIRD_PLACE: '3er puesto',
  FINAL: 'Final',
}

function stageOrder(stage: string): number {
  const order = [
    'ROUND_OF_32',
    'ROUND_OF_16',
    'QUARTER_FINAL',
    'SEMI_FINAL',
    'THIRD_PLACE',
    'FINAL',
  ]
  return order.indexOf(stage)
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

function getMatchStatus(match: MatchWithTeams): {
  label: string
  variant: 'upcoming' | 'live' | 'finished'
} {
  const now = new Date()
  const matchDate = new Date(match.utcDate)

  if (match.winner !== null) {
    return { label: 'Terminado', variant: 'finished' }
  }

  if (matchDate <= now) {
    return { label: 'En curso', variant: 'live' }
  }

  return { label: 'Próximo', variant: 'upcoming' }
}

function TeamOption({
  team,
  placeholder,
  selected,
  onClick,
  disabled,
  label,
  compact = false,
}: {
  team?: Team | null
  placeholder?: string | null
  selected: boolean
  onClick: () => void
  disabled: boolean
  label: string
  compact?: boolean
}) {
  const name = team?.name || placeholder || 'TBD'
  const flag = getFlagUrl(team?.code)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`team-option flex-1 flex flex-col items-center justify-center gap-1.5 ${
        compact ? 'p-2' : 'p-3'
      } ${selected ? 'selected' : ''} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <span className={`font-bold uppercase tracking-wider text-slate-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        {label}
      </span>
      {flag ? (
        <Image
          src={flag}
          alt={name}
          width={compact ? 40 : 56}
          height={compact ? 26 : 38}
          className={`object-cover rounded-md shadow-sm ${compact ? 'w-9 h-6' : 'w-12 h-8'}`}
        />
      ) : (
        <div className={`rounded-md bg-slate-100 border border-dashed border-slate-300 ${compact ? 'w-9 h-6' : 'w-12 h-8'}`} />
      )}
      <span className={`font-semibold text-slate-900 text-center leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>
        {name}
      </span>
    </button>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })
}

function StatusBadge({ status }: { status: { label: string; variant: 'upcoming' | 'live' | 'finished' } }) {
  const classes =
    status.variant === 'finished'
      ? 'bg-slate-100 text-slate-600'
      : status.variant === 'live'
      ? 'bg-amber-50 text-amber-600'
      : 'bg-accent-light text-accent-dark'

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold ${classes}`}>
      {status.label}
    </span>
  )
}

function ByMatchView({
  users,
  matches,
  onMessage,
}: {
  users: UserWithPredictions[]
  matches: MatchWithTeams[]
  onMessage: (msg: string) => void
}) {
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [state, setState] = useState<Record<string, MatchWinner | ''>>({})
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const selectedMatch = matches.find((m) => m.id === selectedMatchId)

  const sortedMatches = useMemo(
    () =>
      [...matches].sort(
        (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      ),
    [matches]
  )

  function selectMatch(matchId: string) {
    setSelectedMatchId(matchId)

    const initial: Record<string, MatchWinner | ''> = {}
    for (const user of users) {
      const pred = user.predictions.find((p) => p.matchId === matchId)
      initial[user.id] = pred?.predictedWinner || ''
    }
    setState(initial)
  }

  function updateWinner(userId: string, winner: MatchWinner | '') {
    setState((prev) => ({ ...prev, [userId]: winner }))
  }

  async function handleSave() {
    if (!selectedMatchId) {
      onMessage('Selecciona un partido')
      return
    }

    const entries = Object.entries(state).filter(([, winner]) => winner !== '')
    if (entries.length === 0) {
      onMessage('No hay predicciones para guardar')
      return
    }

    setSaving(true)
    setProgress({ done: 0, total: entries.length })
    onMessage('')

    let done = 0
    for (const [userId, winner] of entries) {
      const result = await savePredictions(userId, [
        { matchId: selectedMatchId, predictedWinner: winner as MatchWinner },
      ])
      done++
      setProgress({ done, total: entries.length })
      if ('error' in result) {
        onMessage(result.error)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    onMessage(`Guardado ${done} predicción${done === 1 ? '' : 'es'}`)
    setTimeout(() => onMessage(''), 3000)
  }

  async function handleDelete(userId: string) {
    const user = users.find((u) => u.id === userId)
    const pred = user?.predictions.find((p) => p.matchId === selectedMatchId)
    if (!pred) return

    const result = await deletePrediction(pred.id)
    if ('error' in result) {
      onMessage(result.error)
    } else {
      setState((prev) => ({ ...prev, [userId]: '' }))
      onMessage('Predicción eliminada')
      setTimeout(() => onMessage(''), 3000)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="surface p-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Seleccionar partido
        </label>
        <select
          value={selectedMatchId}
          onChange={(e) => selectMatch(e.target.value)}
          className="w-full form-input"
        >
          <option value="">-- Elige un partido --</option>
          {sortedMatches.map((m) => (
            <option key={m.id} value={m.id}>
              {STAGE_LABELS[m.stage] || m.stage} · {m.homeTeam?.name || m.placeholderA || 'TBD'} vs{' '}
              {m.awayTeam?.name || m.placeholderB || 'TBD'}
            </option>
          ))}
        </select>
      </div>

      {selectedMatch && (
        <>
          <div className="surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {STAGE_LABELS[selectedMatch.stage] || selectedMatch.stage}
                  </span>
                  <StatusBadge status={getMatchStatus(selectedMatch)} />
                </div>
                <div className="text-sm text-slate-500">{formatDate(selectedMatch.utcDate)}</div>
              </div>
              {selectedMatch.matchNumber && (
                <span className="text-xs font-bold text-slate-400">#{selectedMatch.matchNumber}</span>
              )}
            </div>

            <div className="flex items-stretch gap-3">
              <div className="flex-1 surface p-4 flex flex-col items-center justify-center gap-2">
                {selectedMatch.homeTeam && getFlagUrl(selectedMatch.homeTeam.code) ? (
                  <Image
                    src={getFlagUrl(selectedMatch.homeTeam.code)!}
                    alt={selectedMatch.homeTeam.name}
                    width={64}
                    height={42}
                    className="object-cover rounded-lg w-16 h-10 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-10 rounded-lg bg-slate-100 border border-dashed border-slate-300" />
                )}
                <span className="font-display text-lg font-bold text-slate-900 text-center">
                  {selectedMatch.homeTeam?.name || selectedMatch.placeholderA || 'TBD'}
                </span>
              </div>
              <div className="flex items-center justify-center px-2">
                <span className="text-slate-400 font-display font-bold">VS</span>
              </div>
              <div className="flex-1 surface p-4 flex flex-col items-center justify-center gap-2">
                {selectedMatch.awayTeam && getFlagUrl(selectedMatch.awayTeam.code) ? (
                  <Image
                    src={getFlagUrl(selectedMatch.awayTeam.code)!}
                    alt={selectedMatch.awayTeam.name}
                    width={64}
                    height={42}
                    className="object-cover rounded-lg w-16 h-10 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-10 rounded-lg bg-slate-100 border border-dashed border-slate-300" />
                )}
                <span className="font-display text-lg font-bold text-slate-900 text-center">
                  {selectedMatch.awayTeam?.name || selectedMatch.placeholderB || 'TBD'}
                </span>
              </div>
            </div>
          </div>

          <div className="surface p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-slate-900">Predicciones por jugador</h3>
              <span className="text-xs font-semibold text-slate-500">
                {users.length} jugadores
              </span>
            </div>

            <div className="space-y-3">
              {users.map((user) => {
                const winner = state[user.id] || ''
                const hasExisting = user.predictions.some((p) => p.matchId === selectedMatchId)

                return (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3 min-w-[12rem]">
                      {user.imageUrl ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-slate-200 shrink-0">
                          <Image src={user.imageUrl} alt={user.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-display font-bold shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-slate-900">{user.name}</span>
                    </div>

                    <div className="flex-1 flex items-stretch gap-2">
                      <TeamOption
                        team={selectedMatch.homeTeam}
                        placeholder={selectedMatch.placeholderA}
                        selected={winner === 'HOME'}
                        onClick={() => updateWinner(user.id, 'HOME')}
                        disabled={false}
                        label="Local"
                        compact
                      />
                      <TeamOption
                        team={selectedMatch.awayTeam}
                        placeholder={selectedMatch.placeholderB}
                        selected={winner === 'AWAY'}
                        onClick={() => updateWinner(user.id, 'AWAY')}
                        disabled={false}
                        label="Visitante"
                        compact
                      />
                    </div>

                    {hasExisting && (
                      <button
                        type="button"
                        onClick={() => handleDelete(user.id)}
                        className="text-xs font-semibold text-danger hover:text-red-700 transition-colors px-2"
                      >
                        Borrar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-primary py-3 disabled:opacity-60"
              >
                {saving
                  ? `Guardando ${progress.done}/${progress.total}...`
                  : 'Guardar predicciones de este partido'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ByPlayerView({
  users,
  matches,
  onMessage,
}: {
  users: UserWithPredictions[]
  matches: MatchWithTeams[]
  onMessage: (msg: string) => void
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [state, setState] = useState<Record<string, MatchWinner | ''>>({})
  const [saving, setSaving] = useState(false)

  const selectedUser = users.find((u) => u.id === selectedUserId)

  function buildStateForUser(userId: string) {
    const user = users.find((u) => u.id === userId)
    const predictionMap = new Map<string, PredictionWithMatch>()
    if (user?.predictions) {
      for (const pred of user.predictions) {
        predictionMap.set(pred.matchId, pred)
      }
    }

    const initial: Record<string, MatchWinner | ''> = {}
    for (const match of matches) {
      const pred = predictionMap.get(match.id)
      initial[match.id] = pred?.predictedWinner || ''
    }
    return initial
  }

  function getPredictionForMatch(matchId: string): PredictionWithMatch | undefined {
    return selectedUser?.predictions.find((p) => p.matchId === matchId)
  }

  function selectUser(userId: string) {
    setSelectedUserId(userId)
    setState(buildStateForUser(userId))
  }

  function updateWinner(matchId: string, winner: MatchWinner | '') {
    setState((prev) => ({ ...prev, [matchId]: winner }))
  }

  async function handleSave() {
    if (!selectedUserId) {
      onMessage('Selecciona un jugador')
      return
    }

    setSaving(true)
    onMessage('')

    const predictions = Object.entries(state)
      .filter(([, winner]) => winner !== '')
      .map(([matchId, winner]) => ({
        matchId,
        predictedWinner: winner as MatchWinner,
      }))

    const result = await savePredictions(selectedUserId, predictions)

    setSaving(false)
    if ('error' in result) {
      onMessage(result.error)
    } else {
      onMessage('Predicciones guardadas')
      setTimeout(() => onMessage(''), 3000)
    }
  }

  async function handleDeletePrediction(matchId: string) {
    const pred = getPredictionForMatch(matchId)
    if (!pred) return

    const result = await deletePrediction(pred.id)
    if ('error' in result) {
      onMessage(result.error)
    } else {
      setState((prev) => ({ ...prev, [matchId]: '' }))
      onMessage('Predicción eliminada')
      setTimeout(() => onMessage(''), 3000)
    }
  }

  const grouped = useMemo(() => {
    const map: Record<string, MatchWithTeams[]> = {}
    for (const match of matches) {
      if (!map[match.stage]) map[match.stage] = []
      map[match.stage].push(match)
    }
    return Object.entries(map).sort(
      (a, b) => stageOrder(a[0]) - stageOrder(b[0])
    )
  }, [matches])

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="surface p-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Seleccionar jugador
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => selectUser(e.target.value)}
          className="w-full form-input"
        >
          <option value="">-- Elige un jugador --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <>
          {grouped.map(([stage, stageMatches]) => (
            <section key={stage} className="surface p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-5 rounded-full bg-accent" />
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {STAGE_LABELS[stage] || stage}
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {stageMatches.map((match) => {
                  const winner = state[match.id]
                  const status = getMatchStatus(match)
                  const hasExisting = getPredictionForMatch(match.id) !== undefined

                  return (
                    <div
                      key={match.id}
                      className="bg-slate-50 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        <span>{formatDate(match.utcDate)}</span>
                        <StatusBadge status={status} />
                      </div>

                      <div className="flex items-stretch gap-2">
                        <TeamOption
                          team={match.homeTeam}
                          placeholder={match.placeholderA}
                          selected={winner === 'HOME'}
                          onClick={() => updateWinner(match.id, 'HOME')}
                          disabled={false}
                          label="Local"
                        />

                        <TeamOption
                          team={match.awayTeam}
                          placeholder={match.placeholderB}
                          selected={winner === 'AWAY'}
                          onClick={() => updateWinner(match.id, 'AWAY')}
                          disabled={false}
                          label="Visitante"
                        />
                      </div>

                      {hasExisting && (
                        <button
                          type="button"
                          onClick={() => handleDeletePrediction(match.id)}
                          className="mt-3 w-full text-sm font-semibold text-danger hover:text-red-700 transition-colors"
                        >
                          Borrar predicción
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-center z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-12 py-3 text-base disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar predicciones'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AdminPanel({
  users,
  matches,
}: {
  users: UserWithPredictions[]
  matches: MatchWithTeams[]
}) {
  const [activeTab, setActiveTab] = useState<'by-match' | 'by-player'>('by-match')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerImage, setNewPlayerImage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedPhotoUserId, setSelectedPhotoUserId] = useState('')
  const [updatingImage, setUpdatingImage] = useState(false)

  async function handleImageChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void
  ) {
    const file = e.target.files?.[0]
    if (!file) {
      setter(null)
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('La imagen no debe superar los 2MB')
      return
    }

    try {
      const base64 = await fileToBase64(file)
      setter(base64)
    } catch {
      setMessage('Error al leer la imagen')
    }
  }

  async function handleCreatePlayer(formData: FormData) {
    setCreating(true)
    setMessage('')
    const result = await createPlayer(formData)
    setCreating(false)

    if ('error' in result) {
      setMessage(result.error)
    } else {
      setNewPlayerName('')
      setNewPlayerImage(null)
      setMessage('Jugador creado')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleLogout() {
    await logoutAdminAction()
  }

  async function handleUpdateImage(imageUrl: string | null) {
    if (!selectedPhotoUserId) return

    setUpdatingImage(true)
    setMessage('')

    const result = await updateUserImage(selectedPhotoUserId, imageUrl || '')

    setUpdatingImage(false)
    if ('error' in result) {
      setMessage(result.error)
    } else {
      setMessage('Foto actualizada')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const selectedPhotoUser = users.find((u) => u.id === selectedPhotoUserId)

  return (
    <div className="space-y-6 pb-24">
      <form action={handleLogout} className="flex justify-end">
        <button
          type="submit"
          className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          Cerrar sesión de admin
        </button>
      </form>

      {/* Player management */}
      <section className="surface p-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1.5 h-5 rounded-full bg-accent" />
          <h2 className="font-display text-xl font-bold text-slate-900">Jugadores</h2>
        </div>

        <form action={handleCreatePlayer} className="space-y-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              name="name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Nombre del compañero"
              className="flex-1 form-input"
            />
            <input type="hidden" name="imageUrl" value={newPlayerImage || ''} />
            <button
              type="submit"
              disabled={creating}
              className="btn-primary px-6 disabled:opacity-60"
            >
              {creating ? '...' : 'Crear'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageChange(e, setNewPlayerImage)}
              className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold hover:file:bg-slate-700"
            />
            {newPlayerImage && (
              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-slate-200">
                <Image src={newPlayerImage} alt="Preview" fill className="object-cover" />
              </div>
            )}
          </div>
        </form>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Actualizar foto de jugador
          </h3>

          <select
            value={selectedPhotoUserId}
            onChange={(e) => setSelectedPhotoUserId(e.target.value)}
            className="w-full form-input"
          >
            <option value="">-- Elige un jugador --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {selectedPhotoUser && (
            <div className="flex items-center gap-4">
              {selectedPhotoUser.imageUrl ? (
                <div className="relative w-14 h-14 rounded-full overflow-hidden ring-1 ring-slate-200">
                  <Image
                    src={selectedPhotoUser.imageUrl}
                    alt={selectedPhotoUser.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-display text-xl font-bold">
                  {selectedPhotoUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 2 * 1024 * 1024) {
                    setMessage('La imagen no debe superar los 2MB')
                    return
                  }
                  try {
                    const base64 = await fileToBase64(file)
                    await handleUpdateImage(base64)
                  } catch {
                    setMessage('Error al leer la imagen')
                  }
                }}
                disabled={updatingImage}
                className="text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-semibold hover:file:bg-slate-700 disabled:opacity-60"
              />
              {updatingImage && <span className="text-slate-500 text-sm">Subiendo...</span>}
            </div>
          )}
        </div>
      </section>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm ${
            message.includes('Error') || message.includes('incorrecta') || message.includes('existe')
              ? 'bg-red-50 border border-red-100 text-danger'
              : 'bg-accent-light border border-green-100 text-accent-dark'
          }`}
        >
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('by-match')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'by-match'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Por partido
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('by-player')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'by-player'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Por jugador
        </button>
      </div>

      {activeTab === 'by-match' ? (
        <ByMatchView users={users} matches={matches} onMessage={setMessage} />
      ) : (
        <ByPlayerView users={users} matches={matches} onMessage={setMessage} />
      )}
    </div>
  )
}
