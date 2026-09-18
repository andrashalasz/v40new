import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { refundOrder } from '~~/server/utils/checkout'

/**
 * Egy foglalás online fizetésének visszatérítése + a foglalás lemondása.
 *
 * Megkeresi a foglaláshoz tartozó kifizetett rendelést, visszautalja a pénzt
 * (sztornó számlával), majd a foglalást CANCELLED-re állítja és felszabadítja az
 * idősávot. Bérletes levonás esetén az alkalmat visszaírja.
 */
const body = z.object({ reason: z.string().max(500).optional() })

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const ref = getRouterParam(event, 'ref')
  if (!ref) throw createError({ statusCode: 400, statusMessage: 'Hiányzó azonosító.' })
  const { reason } = await readValidatedBody(event, body.parse)

  const appt = await prisma.appointment.findUnique({
    where: { publicRef: ref },
    include: {
      redemption: true,
      orderItems: { include: { order: { include: { payments: true } } } },
    },
  })
  if (!appt) throw createError({ statusCode: 404, statusMessage: 'A foglalás nem található.' })

  // A foglaláshoz tartozó, kifizetett (nem no-show) rendelés keresése.
  const paidItem = appt.orderItems.find((oi) =>
    oi.order.status === 'PAID' && oi.order.payments.some((p) => p.status === 'SUCCEEDED'),
  )

  let refund: Awaited<ReturnType<typeof refundOrder>> | null = null
  if (paidItem) {
    refund = await refundOrder(paidItem.orderId, reason ?? 'Foglalás visszatérítése')
    if (!refund.ok) {
      throw createError({ statusCode: 402, statusMessage: refund.reason ?? 'A visszatérítés sikertelen.' })
    }
  }

  // Foglalás lemondása + idősáv felszabadítása + bérlet-alkalom visszaírása.
  await prisma.$transaction(async (tx) => {
    if (appt.status !== 'CANCELLED') {
      await tx.appointment.update({
        where: { id: appt.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledByUserId: admin.id,
          cancellationReason: reason ?? 'Visszatérítés',
          slotLock: null,
          roomSlotLock: null,
        },
      })
    }
    if (appt.redemption && !appt.redemption.reversedAt) {
      await tx.passRedemption.update({
        where: { id: appt.redemption.id },
        data: { reversedAt: new Date(), reversalReason: 'Visszatérítés – alkalom visszaírva.' },
      })
      await tx.customerPass.update({
        where: { id: appt.redemption.customerPassId },
        data: { sessionsRemaining: { increment: appt.redemption.sessionsUsed } },
      })
    }
  })

  return {
    ok: true,
    refunded: refund?.ok ? (refund.refundedGross ?? 0) : 0,
    hadPayment: !!paidItem,
  }
})
