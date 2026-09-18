import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'

/**
 * Orvos hozzárendelése / leválasztása egy pácienshez. Csak admin.
 * body: { doctorId, action: 'add' | 'remove' }
 */
const body = z.object({
  doctorId: z.number().int().positive(),
  action: z.enum(['add', 'remove']),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const patientId = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(patientId)) throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })
  const { doctorId, action } = await readValidatedBody(event, body.parse)

  const doctor = await prisma.user.findUnique({ where: { id: doctorId }, select: { role: true } })
  if (!doctor || doctor.role !== 'DOCTOR') {
    throw createError({ statusCode: 400, statusMessage: 'A megadott felhasználó nem orvos.' })
  }

  if (action === 'add') {
    await prisma.patientDoctor.upsert({
      where: { patientId_doctorId: { patientId, doctorId } },
      create: { patientId, doctorId },
      update: {},
    })
  } else {
    await prisma.patientDoctor.deleteMany({ where: { patientId, doctorId } })
  }

  await audit(event, admin.id, `patient.doctor.${action}`, 'User', patientId, { doctorId })
  return { ok: true }
})
