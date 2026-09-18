import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * Regisztrált páciensek listája az adminnak, minden lényeges adattal.
 * Csak a USER szerepkör (a STAFF/ADMIN nem páciens). A foglalások számát is
 * visszaadjuk, hogy az admin lássa, ki aktív.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      emailVerifiedAt: true,
      passwordHash: true, // csak a "van-e jelszó" jelzéshez, alább boolean-né alakítjuk
      marketingConsentAt: true,
      privacyAcceptedAt: true,
      createdAt: true,
      _count: { select: { appointments: true, healthMetrics: true, patientLinks: true } },
    },
  })

  return {
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      registered: Boolean(u.passwordHash), // van jelszó = valódi regisztráció (nem csak vendég-foglalás)
      emailVerified: Boolean(u.emailVerifiedAt),
      marketingConsent: Boolean(u.marketingConsentAt),
      privacyAcceptedAt: u.privacyAcceptedAt,
      // Melyik fiókhoz érkezett egészségügyi adat, és van-e hozzárendelt orvos.
      // Több fiók esetén enélkül nem deríthető ki, melyikben van az adat.
      healthMetrics: u._count.healthMetrics,
      doctorCount: u._count.patientLinks,
      createdAt: u.createdAt,
      appointmentCount: u._count.appointments,
    })),
  }
})
