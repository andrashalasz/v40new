import { prisma } from '~~/server/utils/prisma'
import { requireStaffOrDoctor } from '~~/server/utils/guard'

/**
 * Egy páciens adatai + kezelései + feltöltött dokumentumai a szakvélemény-
 * íráshoz. Orvos csak a hozzárendelt páciensét nézheti.
 */
export default defineEventHandler(async (event) => {
  const me = await requireStaffOrDoctor(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })

  if (me.role === 'DOCTOR') {
    const link = await prisma.patientDoctor.findFirst({ where: { patientId: id, doctorId: me.id } })
    if (!link) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const patient = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, birthDate: true },
  })
  if (!patient) throw createError({ statusCode: 404, statusMessage: 'A páciens nem található.' })

  const [appointments, documents] = await Promise.all([
    prisma.appointment.findMany({
      where: { userId: id, status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] } },
      orderBy: { startsAt: 'desc' },
      take: 50,
      select: { id: true, startsAt: true, status: true, service: { select: { title: true } } },
    }),
    prisma.patientDocument.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, fileName: true, mimeType: true, createdAt: true },
    }),
  ])

  return {
    patient: {
      id: patient.id,
      email: patient.email,
      name: [patient.lastName, patient.firstName].filter(Boolean).join(' ') || patient.email,
      phone: patient.phone,
      birthDate: patient.birthDate,
    },
    appointments: appointments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt,
      status: a.status,
      serviceTitle: a.service.title,
    })),
    documents,
  }
})
