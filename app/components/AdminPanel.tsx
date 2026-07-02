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
      className={`team-option flex-1 flex flex-col items-center justify-center gap-2 p-4 ${
        selected ? 'selected' : ''
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <span className="text-xs font-display uppercase tracking-wide text-[#4a4539]">
        {label}
      </span>
      {flag ? (
        <Image
          src={flag}
          alt={name}
          width={56}
          height={38}
          className="object-cover rounded-md w-14 h-9 shadow-sm"
        />
      ) : (
        <div className="w-14 h-9 rounded-md bg-[#f7f3e8] border-2 border-dashed border-[#efe9d8]" />
      )}
      <span className="font-display text-lg text-[#1a1a1a] text-center leading-tight">
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
          className="text-sm text-[#4a4539] hover:text-[#1a5f2a] transition-colors underline"
        >
          Cerrar sesión de admin
        </button>
      </form>

      {/* Player management */}
      <div className="bg-white rounded-2xl border-2 border-[#1a5f2a] p-6 shadow-[0_4px_0_rgba(0,0,0,0.06)]">
        <h2 className="font-display text-2xl text-[#1a1a1a] mb-4">Jugadores</h2>

        <form action={handleCreatePlayer} className="space-y-4 mb-6 p-4 bg-[#f7f3e8] rounded-xl">
          <div className="flex gap-3">
            <input
              name="name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Nombre del compañero"
              className="flex-1 h-12 px-4 bg-white border-2 border-[#efe9d8] rounded-lg focus:border-[#1a5f2a] focus:outline-none"
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
              className="text-sm text-[#4a4539] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#1a5f2a] file:text-white hover:file:bg-[#2d8a3e]"
            />
            {newPlayerImage && (
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#ffd700]">
                <Image src={newPlayerImage} alt="Preview" fill className="object-cover" />
              </div>
            )}
          </div>
        </form>

        <label className="block font-display uppercase tracking-wide text-[#4a4539] mb-2">
          Seleccionar jugador
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => selectUser(e.target.value)}
          className="w-full h-12 px-4 bg-[#f7f3e8] border-2 border-[#efe9d8] rounded-lg focus:border-[#1a5f2a] focus:outline-none text-[#1a1a1a]"
        >
          <option value="">-- Elige un jugador --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {selectedUser && (
          <div className="mt-6 pt-6 border-t-2 border-dashed border-[#efe9d8]">
            <h3 className="font-display uppercase tracking-wide text-[#4a4539] mb-3">
              Foto del jugador
            </h3>
            <div className="flex items-center gap-4">
              {selectedUser.imageUrl ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#1a5f2a]">
                  <Image
                    src={selectedUser.imageUrl}
                    alt={selectedUser.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#1a5f2a] flex items-center justify-center text-white font-display text-2xl">
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
                className="text-sm text-[#4a4539] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#1a5f2a] file:text-white hover:file:bg-[#2d8a3e] disabled:opacity-60"
              />
              {updatingImage && <span className="text-[#4a4539] text-sm">Subiendo...</span>}
            </div>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm ${
            message.includes('Error') || message.includes('incorrecta') || message.includes('existe')
              ? 'bg-[#d93025]/10 border border-[#d93025]/30 text-[#d93025]'
              : 'bg-[#1a5f2a]/10 border border-[#1a5f2a]/30 text-[#1a5f2a]'
          }`}
        >
          {message}
        </div>
      )}

      {selectedUser && (
        <>
          {grouped.map(([stage, stageMatches]) => (
            <div key={stage} className="bg-white rounded-2xl border-2 border-[#efe9d8] p-6 shadow-[0_4px_0_rgba(0,0,0,0.06)]">
              <h2 className="font-display text-xl text-[#1a5f2a] uppercase tracking-wide mb-4">
                {STAGE_LABELS[stage] || stage}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {stageMatches.map((match) => {
                  const locked = isLocked(match)
                  const winner = state[match.id]
                  const hasExisting = getPredictionForMatch(match.id) !== undefined

                  return (
                    <div
                      key={match.id}
                      className={`bg-[#f7f3e8] rounded-xl border-2 border-[#efe9d8] p-4 ${
                        locked ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm text-[#4a4539] mb-3">
                        <span className="font-medium">{formatDate(match.utcDate)}</span>
                        {locked && (
                          <span className="bg-[#d93025] text-white text-xs px-2 py-0.5 rounded-full uppercase tracking-wide">
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

                        <button
                          type="button"
                          onClick={() => updateWinner(match.id, 'DRAW')}
                          disabled={locked}
                          className={`team-option draw px-3 flex flex-col items-center justify-center gap-1 ${
                            winner === 'DRAW' ? 'selected' : ''
                          } disabled:opacity-60`}
                        >
                          <span className="text-xs font-display uppercase text-[#4a4539]">Empate</span>
                          <span className="text-2xl">⚖️</span>
                        </button>

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
                          className="mt-3 w-full text-sm text-[#d93025] hover:text-[#b71c1c] transition-colors underline"
                        >
                          Borrar predicción
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#1a5f2a] p-4 flex justify-center z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-12 py-3 text-xl disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar predicciones'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
