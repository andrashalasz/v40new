import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'

/**
 * Felhasználó módosítása: aktiválás/deaktiválás és alapadatok. Csak admin.
 */
const body = z.object({
  isActive: z.boolean().optional(),
  firstName: z.string().max(100).nullish(),
  lastName: z.string().max(100).nullish(),
  phone: z.string().max(40).nullish(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })
  const d = await readValidatedBody(event, body.parse)

  const data: Record<string, unknown> = {}
  if (d.isActive !== undefined) data.isActive = d.isActive
  if (d.firstName !== undefined) data.firstName = d.firstName
  if (d.lastName !== undefined) data.lastName = d.lastName
  if (d.phone !== undefined) data.phone = d.phone
  if (d.birthDate !== undefined) data.birthDate = d.birthDate ? new Date(`${d.birthDate}T00:00:00Z`) : null

  const user = await prisma.user.update({ where: { id }, data, select: { id: true, isActive: true } })
  await audit(event, admin.id, 'user.update', 'User', id, data)
  return { ok: true, isActive: user.isActive }
})
