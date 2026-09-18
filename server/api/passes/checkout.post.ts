import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'
import { getPaymentProvider } from '~~/server/utils/payments'

/**
 * Bérlet vásárlása online fizetéssel.
 *
 * A bérlet fiókhoz kötött (később a foglalásnál beváltható), ezért belépés
 * szükséges. Létrehozzuk a rendelést (PENDING) + a bérletet (PENDING_PAYMENT),
 * és PaymentIntentet indítunk. A sikeres fizetés a bérletet ACTIVE-ra állítja és
 * kiállítja a számlát (finalizePaidCheckout).
 */

const body = z.object({
  slug: z.string().min(1),
  billing: z
    .object({
      name: z.string().max(200).optional(),
      taxNumber: z.string().max(30).optional(),
      zip: z.string().max(20).optional(),
      city: z.string().max(120).optional(),
      address: z.string().max(200).optional(),
    })
    .optional(),
})

function passCode(): string {
  return `V40-BER-${randomBytes(4).toString('hex').toUpperCase().slice(0, 6)}`
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { slug, billing } = await readValidatedBody(event, body.parse)

  const template = await prisma.passTemplate.findFirst({
    where: { slug, archivedAt: null, isActive: true },
  })
  if (!template) throw createError({ statusCode: 404, statusMessage: 'A bérlet nem található.' })

  const settings = await prisma.clinicSettings.findUnique({ where: { id: 1 } })
  const currency = settings?.currency ?? 'HUF'
  const amount = template.priceGross

  const validFrom = new Date()
  const validUntil = new Date(validFrom.getTime() + template.validityDays * 24 * 60 * 60 * 1000)

  const provider = getPaymentProvider()
  const checkout = await provider.createCheckout({
    email: user.email ?? null,
    amountMinor: amount,
    currency,
    metadata: { passSlug: slug, userId: String(user.id) },
  })

  await prisma.order.create({
    data: {
      orderNumber: `V40-BER-${randomBytes(3).toString('hex')}`,
      userId: user.id,
      status: 'PENDING',
      totalGross: amount,
      currency,
      billingName: billing?.name || null,
      billingTaxNumber: billing?.taxNumber || null,
      billingZip: billing?.zip || null,
      billingCity: billing?.city || null,
      billingAddress: billing?.address || null,
      items: {
        create: {
          kind: 'PASS',
          passTemplateId: template.id,
          titleSnapshot: template.title,
          quantity: 1,
          unitPriceGross: amount,
          vatRate: template.vatRate,
          vatExemptReason: template.vatExemptReason,
        },
      },
      payments: {
        create: {
          provider: checkout.provider,
          providerPaymentId: checkout.paymentIntentId,
          status: 'INITIATED',
          amountGross: amount,
          currency,
          idempotencyKey: `pass-checkout-${checkout.paymentIntentId}`,
        },
      },
      passes: {
        create: {
          code: passCode(),
          userId: user.id,
          passTemplateId: template.id,
          sessionsTotal: template.sessionCount,
          sessionsRemaining: template.sessionCount,
          validFrom,
          validUntil,
          status: 'PENDING_PAYMENT',
          purchasePriceGross: amount,
        },
      },
    },
  })

  return {
    mock: checkout.mock,
    paymentIntentId: checkout.paymentIntentId,
    clientSecret: checkout.clientSecret,
    publishableKey: checkout.publishableKey,
    amountGross: amount,
    currency,
  }
})
