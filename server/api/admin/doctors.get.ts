import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/** Orvosok listája (szerep = DOCTOR) a hozzárendeléshez. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const doctors = await prisma.user.findMany({
    where: { role: 'DOCTOR', isActive: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  return {
    items: doctors.map((d) => ({
      id: d.id, name: [d.lastName, d.firstName].filter(Boolean).join(' ') || d.email, email: d.email,
    })),
  }
})
