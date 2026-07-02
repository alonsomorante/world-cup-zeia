'use server'

import { revalidatePath } from 'next/cache'
import { MatchWinner, User } from '@prisma/client'
import { prisma } from './prisma'
import {
  verifyAdminPassword,
  createAdminSession,
  logoutAdmin,
  requireAdmin,
} from './admin-auth'

export async function loginAdmin(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const password = formData.get('password') as string

  if (!password || !(await verifyAdminPassword(password))) {
    return { error: 'Contraseña incorrecta' }
  }

  await createAdminSession()
  revalidatePath('/admin')
  return { success: true }
}

export async function logoutAdminAction() {
  await logoutAdmin()
  revalidatePath('/admin')
}

export async function createPlayer(
  formData: FormData
): Promise<{ success: true; user: User } | { error: string }> {
  await requireAdmin()

  const name = (formData.get('name') as string)?.trim()
  const imageUrl = (formData.get('imageUrl') as string) || null

  if (!name) {
    return { error: 'El nombre es obligatorio' }
  }

  try {
    const user = await prisma.user.create({
      data: { name, imageUrl },
    })
    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true, user }
  } catch {
    return { error: 'Ese nombre ya existe' }
  }
}

export async function updateUserImage(
  userId: string,
  imageUrl: string
): Promise<{ success: true; user: User } | { error: string }> {
  await requireAdmin()

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { imageUrl: imageUrl || null },
    })
    revalidatePath('/')
    revalidatePath(`/player/${userId}`)
    revalidatePath('/admin')
    return { success: true, user }
  } catch {
    return { error: 'No se pudo actualizar la foto' }
  }
}

export async function savePredictions(
  userId: string,
  predictions: {
    matchId: string
    predictedWinner: MatchWinner
  }[]
): Promise<{ success: true } | { error: string }> {
  await requireAdmin()

  for (const pred of predictions) {
    const match = await prisma.match.findUnique({
      where: { id: pred.matchId },
    })

    if (!match) continue

    await prisma.prediction.upsert({
      where: {
        userId_matchId: {
          userId,
          matchId: pred.matchId,
        },
      },
      create: {
        userId,
        matchId: pred.matchId,
        predictedWinner: pred.predictedWinner,
        homeScore: null,
        awayScore: null,
      },
      update: {
        predictedWinner: pred.predictedWinner,
        homeScore: null,
        awayScore: null,
      },
    })
  }

  revalidatePath('/')
  revalidatePath(`/player/${userId}`)
  revalidatePath('/admin')
  return { success: true }
}

export async function deletePrediction(
  predictionId: string
): Promise<{ success: true } | { error: string }> {
  await requireAdmin()

  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    include: { match: true },
  })

  if (!prediction) {
    return { error: 'Predicción no encontrada' }
  }

  await prisma.prediction.delete({ where: { id: predictionId } })

  revalidatePath('/')
  revalidatePath(`/player/${prediction.userId}`)
  revalidatePath('/admin')
  return { success: true }
}
