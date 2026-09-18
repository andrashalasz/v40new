import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { getPaymentProvider } from '~~/server/utils/payments'
import { finalizePaidCheckout } from '~~/server/utils/checkout'

/**
 * Online fizetés véglegesítése.
 *
 * A böngésző a Stripe felé megerősítette a fizetést; itt a szolgáltatótól
 * lekérdezzük a végleges állapotot, és sikernél Order -> PAID, Appointment ->
 * CONFIRMED. Idempotens a webhookkal (mindkettő a finalizePaidCheckout-ot hívja).
 */

const body = z.object({ publicRef: z.string().min(4) })

export default defineEventHandler(async (event) => {
  const { publicRef } = await readValidatedBody(event, body.parse)

  const payment = await prisma.payment.findFirst({
    where: { order: { items: { some: { appointment: { publicRef } } } } },
    orderBy: { initiatedAt: 'desc' },
  })
  if (!payment || !payment.providerPaymentId) {
    throw createError({ statusCode: 404, statusMessage: 'Nincs elindított fizetés ehhez a foglaláshoz.' })
  }

  if (payment.status === 'SUCCEEDED') {
    return { status: 'SUCCEEDED' }
  }

  const provider = getPaymentProvider()
  const state = await provider.getPaymentState(payment.providerPaymentId)

  if (state.status === 'SUCCEEDED') {
    await finalizePaidCheckout(payment.providerPaymentId)
    return { status: 'SUCCEEDED' }
  }

  if (state.status === 'FAILED') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return { status: 'FAILED' }
  }

  return { status: 'PENDING' }
})
