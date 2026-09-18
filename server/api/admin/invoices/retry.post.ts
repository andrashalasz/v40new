import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { issueInvoiceForOrder } from '~~/server/utils/checkout'

/**
 * Egy elakadt (ERROR / PENDING) számla újbóli kiállítása. A sikeres, élő
 * számlát nem bántja. A hibás draftot eldobjuk, majd újra kiállíttatjuk.
 */
const body = z.object({ invoiceId: z.number().int().positive() })

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { invoiceId } = await readValidatedBody(event, body.parse)

  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } })
  if (!inv) throw createError({ statusCode: 404, statusMessage: 'A számla nem található.' })
  if (inv.invoiceNumber && inv.navStatus && !inv.navStatus.startsWith('ERROR')) {
    throw createError({ statusCode: 409, statusMessage: 'Ez a számla már ki van állítva.' })
  }

  const orderId = inv.orderId
  await prisma.invoice.delete({ where: { id: inv.id } })
  const issued = await issueInvoiceForOrder(orderId)

  if (!issued || (issued.navStatus ?? '').startsWith('ERROR')) {
    throw createError({ statusCode: 502, statusMessage: `A kiállítás ismét elakadt: ${issued?.navStatus ?? 'ismeretlen hiba'}` })
  }
  return { ok: true, invoiceNumber: issued.invoiceNumber, navStatus: issued.navStatus }
})
