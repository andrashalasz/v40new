import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * Foglalások listája az adminnak, a kártya-biztosíték állapotával együtt.
 *
 * A no-show terheléshez az adminnak látnia kell, mely foglaláshoz tartozik
 * aktív (terhelhető) kártya. A legfrissebb foglalások elöl.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const take = Math.min(Number(q.take) || 100, 300)

  const appointments = await prisma.appointment.findMany({
    orderBy: { startsAt: 'desc' },
    take,
    include: {
      user: { select: { email: true, firstName: true, lastName: true, phone: true } },
      service: { select: { title: true } },
      practitioner: { select: { name: true } },
      guarantee: {
        select: { status: true, cardBrand: true, cardLast4: true, chargedPaymentId: true },
      },
    },
  })

  return {
    items: appointments.map((a) => ({
      publicRef: a.publicRef,
      startsAt: a.startsAt,
      status: a.status,
      settlement: a.settlement,
      priceGross: a.priceGross,
      customerName: [a.user.lastName, a.user.firstName].filter(Boolean).join(' ') || '—',
      customerEmail: a.user.email,
      customerPhone: a.user.phone,
      serviceTitle: a.service.title,
      practitionerName: a.practitioner.name,
      guarantee: a.guarantee
        ? {
            status: a.guarantee.status,
            cardBrand: a.guarantee.cardBrand,
            cardLast4: a.guarantee.cardLast4,
            charged: !!a.guarantee.chargedPaymentId,
          }
        : null,
    })),
  }
})
