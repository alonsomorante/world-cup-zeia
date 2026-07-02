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

function isLocked(match: MatchWithTeams): boolean {
  return new Date(match.utcDate) <= new Date()
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

function TeamOption({
  team,
  placeholder,
  selected,
  onClick,
  disabled,
  label,
}: {
  team?: Team | null
  placeholder?: string | null
  selected: boolean
  onClick: () => void
  disabled: boolean
  label: string
}) {
  const name = team?.name || placeholder || 'TBD'
  const flag = getFlagUrl(team?.code)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`team-option flex-1 flex flex-col items-center justify-center gap-2 p-3 ${
        selected ? 'selected' : ''
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {flag ? (
        <Image
          src={flag}
          alt={name}
          width={56}
          height={38}
          className="object-cover rounded-md w-12 h-8 shadow-sm"
        />
      ) : (
        <div className="w-12 h-8 rounded-md bg-slate-100 border border-dashed border-slate-300" />
      )}
      <span className="text-sm font-semibold text-slate-900 text-center leading-tight">
        {name}
      </span>
    </button>
  )
}

export default function AdminPanel({
  users,
  matches,
}: {
  users: UserWithPredictions[]
  matches: MatchWithTeams[]
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerImage, setNewPlayerImage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [updatingImage, setUpdatingImage] = useState(false)
  const [message, setMessage] = useState('')

  const selectedUser = users.find((u) => u.id === selectedUserId)

  function buildStateForUser(userId: string) {
    const user = users.find((u) => u.id === userId)
    const predictionMap = new Map<string, PredictionWithMatch>()
    if (user?.predictions) {
      for (const pred of user.predictions) {
        predictionMap.set(pred.matchId, pred)
      }
    }

    const state: Record<string, MatchWinner | ''> = {}
    for (const match of matches) {
      const pred = predictionMap.get(match.id)
      state[match.id] = pred?.predictedWinner || ''
    }
    return state
  }

  function getPredictionForMatch(matchId: string): PredictionWithMatch | undefined {
    return selectedUser?.predictions.find((p) => p.matchId === matchId)
  }

  const [state, setState] = useState(() => buildStateForUser(selectedUserId))

  function selectUser(userId: string) {
    setSelectedUserId(userId)
    setState(buildStateForUser(userId))
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

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

  function updateWinner(matchId: string, winner: MatchWinner | '') {
    setState((prev) => ({ ...prev, [matchId]: winner }))
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
      selectUser(result.user.id)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleSave() {
    if (!selectedUserId) {
      setMessage('Selecciona un jugador')
      return
    }

    setSaving(true)
    setMessage('')

    const predictions = Object.entries(state)
      .filter(([, winner]) => winner !== '')
      .map(([matchId, winner]) => ({
        matchId,
        predictedWinner: winner as MatchWinner,
      }))

    const result = await savePredictions(selectedUserId, predictions)

    setSaving(false)
    if ('error' in result) {
      setMessage(result.error)
    } else {
      setMessage('Predicciones guardadas')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleDeletePrediction(matchId: string) {
    const pred = getPredictionForMatch(matchId)
    if (!pred) return

    const result = await deletePrediction(pred.id)
    if ('error' in result) {
      setMessage(result.error)
    } else {
      setState((prev) => ({ ...prev, [matchId]: '' }))
      setMessage('Predicción eliminada')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleUpdateImage(imageUrl: string | null) {
    if (!selectedUserId) return

    setUpdatingImage(true)
    setMessage('')

    const result = await updateUserImage(selectedUserId, imageUrl || '')

    setUpdatingImage(false)
    if ('error' in result) {
      setMessage(result.error)
    } else {
      setMessage('Foto actualizada')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleLogout() {
    await logoutAdminAction()
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
    <div className="space-y-6">
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

        {selectedUser && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Foto del jugador
            </h3>
            <div className="flex items-center gap-4">
              {selectedUser.imageUrl ? (
                <div className="relative w-14 h-14 rounded-full overflow-hidden ring-1 ring-slate-200">
                  <Image
                    src={selectedUser.imageUrl}
                    alt={selectedUser.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-display text-xl font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
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
          </div>
        )}
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

      {selectedUser && (
        <>
          {grouped.map(([stage, stageMatches]) => (
            <section key={stage} className="surface p-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-5 rounded-full bg-accent" />
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {STAGE_LABELS[stage] || stage}
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {stageMatches.map((match) => {
                  const locked = isLocked(match)
                  const winner = state[match.id]
                  const hasExisting = getPredictionForMatch(match.id) !== undefined

                  return (
                    <div
                      key={match.id}
                      className={`bg-slate-50 rounded-xl border border-slate-200 p-4 ${
                        locked ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        <span>{formatDate(match.utcDate)}</span>
                        {locked && (
                          <span className="bg-danger text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Cerrado
                          </span>
                        )}
                      </div>

                      <div className="flex items-stretch gap-2">
                        <TeamOption
                          team={match.homeTeam}
                          placeholder={match.placeholderA}
                          selected={winner === 'HOME'}
                          onClick={() => updateWinner(match.id, 'HOME')}
                          disabled={locked}
                          label="Local"
                        />

                        <TeamOption
                          team={match.awayTeam}
                          placeholder={match.placeholderB}
                          selected={winner === 'AWAY'}
                          onClick={() => updateWinner(match.id, 'AWAY')}
                          disabled={locked}
                          label="Visitante"
                        />
                      </div>

                      {hasExisting && !locked && (
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
              className="btn-primary px-10 py-3 text-base disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar predicciones'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
