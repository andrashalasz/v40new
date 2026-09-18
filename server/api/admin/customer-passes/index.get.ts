import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * Eladott (ügyfél)bérletek listája az adminnak. Nem a bérlet-sablonok (azok a
 * Katalógusban), hanem a megvásárolt, ügyfélhez kötött bérletek.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const passes = await prisma.customerPass.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      passTemplate: { select: { title: true } },
      order: { select: { orderNumber: true, status: true } },
    },
  })

  return {
    items: passes.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.passTemplate.title,
      customerName: [p.user.lastName, p.user.firstName].filter(Boolean).join(' ') || p.user.email,
      customerEmail: p.user.email,
      status: p.status,
      sessionsTotal: p.sessionsTotal,
      sessionsRemaining: p.sessionsRemaining,
      validFrom: p.validFrom,
      validUntil: p.validUntil,
      purchasePriceGross: p.purchasePriceGross,
      orderNumber: p.order?.orderNumber ?? null,
      orderStatus: p.order?.status ?? null,
      refundable: p.status === 'ACTIVE' || p.status === 'EXHAUSTED',
    })),
  }
})
