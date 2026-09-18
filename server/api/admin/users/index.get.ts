import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * Felhasználók listája az adminnak, szerep szerint szűrhetően
 * (?role=USER|DOCTOR|STAFF|ADMIN). Ügyfelek, orvosok és staff kezeléséhez.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const role = String(getQuery(event).role ?? '')
  const where = ['USER', 'DOCTOR', 'STAFF', 'ADMIN'].includes(role) ? { role: role as never } : {}

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, isActive: true, birthDate: true, createdAt: true,
      passwordHash: true,
      _count: { select: { appointments: true, doctorLinks: true } },
    },
  })

  return {
    items: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: [u.lastName, u.firstName].filter(Boolean).join(' ') || '—',
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      birthDate: u.birthDate,
      hasPassword: !!u.passwordHash,
      appointmentCount: u._count.appointments,
      patientCount: u._count.doctorLinks, // orvosnál: hány páciens
      createdAt: u.createdAt,
    })),
  }
})
