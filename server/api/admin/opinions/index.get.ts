import { prisma } from '~~/server/utils/prisma'
import { requireStaffOrDoctor } from '~~/server/utils/guard'

/** Kiállított szakvélemények listája. Orvos csak a sajátjait látja. */
export default defineEventHandler(async (event) => {
  const me = await requireStaffOrDoctor(event)
  const opinions = await prisma.medicalOpinion.findMany({
    where: me.role === 'DOCTOR' ? { authorId: me.id } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      appointment: { select: { service: { select: { title: true } } } },
    },
  })
  return {
    items: opinions.map((o) => ({
      id: o.id,
      documentCode: o.documentCode,
      title: o.title,
      createdAt: o.createdAt,
      patientName: [o.user.lastName, o.user.firstName].filter(Boolean).join(' ') || o.user.email,
      serviceTitle: o.appointment?.service.title ?? null,
    })),
  }
})
