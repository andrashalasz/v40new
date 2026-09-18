import { prisma } from '~~/server/utils/prisma'
import { requireStaffOrDoctor } from '~~/server/utils/guard'

/**
 * Páciensek listája az orvosi munkához.
 *
 * Staff: minden páciens (USER). Orvos: CSAK a hozzárendelt páciensei – a
 * szűrés itt történik, nem a felületen, mert a felület elrejtése nem védelem.
 *
 * A listában benne van, hogy melyik pácienstől érkezett egészségügyi adat és
 * mikor. Enélkül az orvos nem tudja, melyik pácienshez érdemes bemenni – és ha
 * valakinek több fiókja van, azt sem, melyikben van az adat.
 */
export default defineEventHandler(async (event) => {
  const me = await requireStaffOrDoctor(event)

  const where =
    me.role === 'DOCTOR'
      ? { role: 'USER' as const, patientLinks: { some: { doctorId: me.id } } }
      : { role: 'USER' as const }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      _count: {
        select: {
          healthMetrics: true,
          appointments: true,
          medicalOpinions: true,
          documents: true,
        },
      },
      healthSync: {
        select: { platform: true, lastSyncedDay: true },
        orderBy: { lastSyncAt: 'desc' },
        take: 1,
      },
    },
  })

  return {
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: [u.lastName, u.firstName].filter(Boolean).join(' ') || u.email,
      birthDate: u.birthDate,
      healthMetrics: u._count.healthMetrics,
      appointmentCount: u._count.appointments,
      opinionCount: u._count.medicalOpinions,
      documentCount: u._count.documents,
      lastSyncedDay: u.healthSync[0]?.lastSyncedDay ?? null,
    })),
  }
})
