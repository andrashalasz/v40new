import { prisma } from '~~/server/utils/prisma'
import { requireStaffOrDoctor } from '~~/server/utils/guard'

/**
 * Páciensek listája szakvélemény-íráshoz. Staff: minden ügyfél (USER). Orvos:
 * csak a hozzárendelt páciensei.
 */
export default defineEventHandler(async (event) => {
  const me = await requireStaffOrDoctor(event)

  const where = me.role === 'DOCTOR'
    ? { role: 'USER' as const, patientLinks: { some: { doctorId: me.id } } }
    : { role: 'USER' as const }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  return {
    items: users.map((u) => ({
      id: u.id, email: u.email,
      name: [u.lastName, u.firstName].filter(Boolean).join(' ') || u.email,
    })),
  }
})
