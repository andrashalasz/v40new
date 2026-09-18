import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { refundOrder } from '~~/server/utils/checkout'

/**
 * Egy eladott bérlet visszatérítése. Megkeresi a bérlethez tartozó rendelést,
 * visszautalja a pénzt (sztornó számlával), a bérletet REFUNDED-re állítja.
 * Ha nincs online fizetés (pl. helyszínen vásárolt), csak a bérletet zárja le.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })

  const pass = await prisma.customerPass.findUnique({ where: { id } })
  if (!pass) throw createError({ statusCode: 404, statusMessage: 'A bérlet nem található.' })
  if (pass.status === 'REFUNDED' || pass.status === 'CANCELLED') {
    throw createError({ statusCode: 409, statusMessage: 'Ez a bérlet már le van zárva.' })
  }

  if (pass.orderId) {
    const refund = await refundOrder(pass.orderId, 'Bérlet visszatérítése')
    // refundOrder a bérletet is REFUNDED-re állítja
    if (!refund.ok && !refund.alreadyRefunded) {
      // Nincs online fizetés a rendeléshez: csak zárjuk le a bérletet.
      await prisma.customerPass.update({ where: { id }, data: { status: 'REFUNDED' } })
      return { ok: true, refunded: 0, note: refund.reason }
    }
    return { ok: true, refunded: refund.refundedGross ?? 0 }
  }

  // Rendelés nélküli (pl. kézzel adott) bérlet: csak lezárjuk.
  await prisma.customerPass.update({ where: { id }, data: { status: 'REFUNDED' } })
  return { ok: true, refunded: 0 }
})
