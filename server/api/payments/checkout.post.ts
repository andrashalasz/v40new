import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import { getPaymentProvider } from '~~/server/utils/payments'

/**
 * Azonnali online fizetés indítása egy foglaláshoz (a kezelés árára).
 *
 * PaymentIntentet készít és rögzíti az Ordert (PENDING) + Paymentet (INITIATED).
 * A tényleges kártya-/wallet-adatot a böngésző adja a Stripe felé (Payment
 * Element) – ide nyers adat nem érkezik. A véglegesítést a confirm endpoint és
 * a webhook végzi.
 */

const body = z.object({ publicRef: z.string().min(4) })

export default defineEventHandler(async (event) => {
  const { publicRef } = await readValidatedBody(event, body.parse)

  const appointment = await prisma.appointment.findUnique({
    where: { publicRef },
    include: { user: true },
  })
  if (!appointment) throw createError({ statusCode: 404, statusMessage: 'A foglalás nem található.' })
  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
    throw createError({ statusCode: 409, statusMessage: 'Ehhez a foglaláshoz már nem indítható fizetés.' })
  }

  // Már kifizetve? (a foglaláshoz tartozó bármely SUCCEEDED fizetés)
  const paid = await prisma.payment.findFirst({
    where: { status: 'SUCCEEDED', order: { items: { some: { appointmentId: appointment.id } } } },
  })
  if (paid) return { alreadyPaid: true }

  const settings = await prisma.clinicSettings.findUnique({ where: { id: 1 } })
  const currency = settings?.currency ?? 'HUF'
  const amount = appointment.priceGross

  const provider = getPaymentProvider()
  const checkout = await provider.createCheckout({
    email: appointment.user.email,
    name: [appointment.user.lastName, appointment.user.firstName].filter(Boolean).join(' ') || null,
    amountMinor: amount, // HUF nulladecimális -> a "minor" egység maga a forint
    currency,
    metadata: { appointmentId: String(appointment.id), publicRef: appointment.publicRef },
  })

  await prisma.order.create({
    data: {
      orderNumber: `V40-${appointment.publicRef}-${randomBytes(3).toString('hex')}`,
      userId: appointment.userId,
      status: 'PENDING',
      totalGross: amount,
      currency,
      items: {
        create: {
          kind: 'SERVICE',
          appointmentId: appointment.id,
          serviceId: appointment.serviceId,
          titleSnapshot: 'Online fizetés – kezelés',
          quantity: 1,
          unitPriceGross: amount,
          vatRate: appointment.vatRate,
        },
      },
      payments: {
        create: {
          provider: checkout.provider,
          providerPaymentId: checkout.paymentIntentId,
          status: 'INITIATED',
          amountGross: amount,
          currency,
          idempotencyKey: `checkout-${checkout.paymentIntentId}`,
        },
      },
    },
  })

  return {
    alreadyPaid: false,
    mock: checkout.mock,
    paymentIntentId: checkout.paymentIntentId,
    clientSecret: checkout.clientSecret,
    publishableKey: checkout.publishableKey,
    amountGross: amount,
    currency,
  }
})
