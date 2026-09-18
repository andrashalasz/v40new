import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { getPaymentProvider } from '~~/server/utils/payments'
import { finalizePaidCheckout } from '~~/server/utils/checkout'

/**
 * Általános fizetés-véglegesítés PaymentIntent alapján (foglalás és bérlet is).
 *
 * A böngésző a Stripe felé megerősítette a fizetést; itt lekérdezzük a végleges
 * állapotot, és sikernél a finalizePaidCheckout elvégzi a rendelés lezárását
 * (Order PAID, foglalás CONFIRMED / bérlet ACTIVE, számla kiállítása).
 * Idempotens a webhookkal.
 */

const body = z.object({ paymentIntentId: z.string().min(6) })

export default defineEventHandler(async (event) => {
  const { paymentIntentId } = await readValidatedBody(event, body.parse)

  const payment = await prisma.payment.findFirst({ where: { providerPaymentId: paymentIntentId } })
  if (!payment) {
    throw createError({ statusCode: 404, statusMessage: 'Ismeretlen fizetés.' })
  }

  if (payment.status === 'SUCCEEDED') return { status: 'SUCCEEDED' }

  const provider = getPaymentProvider()
  const state = await provider.getPaymentState(paymentIntentId)

  if (state.status === 'SUCCEEDED') {
    await finalizePaidCheckout(paymentIntentId)
    return { status: 'SUCCEEDED' }
  }
  if (state.status === 'FAILED') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return { status: 'FAILED' }
  }
  return { status: 'PENDING' }
})
