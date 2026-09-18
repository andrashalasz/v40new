import { prisma } from '~~/server/utils/prisma'
import { requireStaffOrDoctor } from '~~/server/utils/guard'

/**
 * Egy felhasználó teljes adatlapja az adminnak / a hozzárendelt orvosnak:
 * profil, foglalás/kezelés-történet, bérletek, szakvélemények, feltöltött
 * dokumentumok és a hozzárendelt orvosok. Orvos csak a hozzárendelt pácienst
 * nézheti.
 */
export default defineEventHandler(async (event) => {
  const me = await requireStaffOrDoctor(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })

  // Orvos csak a hozzárendelt pácienst láthatja.
  if (me.role === 'DOCTOR') {
    const link = await prisma.patientDoctor.findFirst({ where: { patientId: id, doctorId: me.id } })
    if (!link) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, isActive: true, birthDate: true, createdAt: true,
      marketingConsentAt: true, privacyAcceptedAt: true,
    },
  })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'A felhasználó nem található.' })

  const [appointments, passes, opinions, documents, doctorLinks, questionnaires] = await Promise.all([
    prisma.appointment.findMany({
      where: { userId: id },
      orderBy: { startsAt: 'desc' },
      take: 100,
      select: { publicRef: true, startsAt: true, status: true, settlement: true, priceGross: true, service: { select: { title: true } }, practitioner: { select: { name: true } } },
    }),
    prisma.customerPass.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { code: true, status: true, sessionsRemaining: true, sessionsTotal: true, validUntil: true, passTemplate: { select: { title: true } } },
    }),
    prisma.medicalOpinion.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, documentCode: true, title: true, createdAt: true },
    }),
    prisma.patientDocument.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, fileName: true, fileUrl: true, mimeType: true, size: true, note: true, createdAt: true },
    }),
    prisma.patientDoctor.findMany({
      where: { patientId: id },
      select: { doctor: { select: { id: true, firstName: true, lastName: true, email: true } } },
    }),
    prisma.questionnaireResponse.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, answers: true, createdAt: true },
    }),
  ])

  return {
    user: {
      ...user,
      name: [user.lastName, user.firstName].filter(Boolean).join(' ') || user.email,
    },
    appointments: appointments.map((a) => ({
      publicRef: a.publicRef, startsAt: a.startsAt, status: a.status, settlement: a.settlement,
      priceGross: a.priceGross, serviceTitle: a.service.title, practitionerName: a.practitioner.name,
    })),
    passes: passes.map((p) => ({ ...p, title: p.passTemplate.title })),
    opinions,
    documents,
    doctors: doctorLinks.map((l) => ({
      id: l.doctor.id, name: [l.doctor.lastName, l.doctor.firstName].filter(Boolean).join(' ') || l.doctor.email,
    })),
    questionnaires,
  }
})
