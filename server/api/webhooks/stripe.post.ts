import { prisma } from '~~/server/utils/prisma'
import { getPaymentProvider } from '~~/server/utils/payments'
import { finalizePaidCheckout } from '~~/server/utils/checkout'

/**
 * Stripe webhook.
 *
 * A törzset NYERSEN kell beolvasni (`readRawBody`), különben az aláírás-
 * ellenőrzés elbukik. Minden esemény bekerül a PaymentEvent naplóba – a
 * (provider, providerEventId) egyedi kulcs adja az idempotenciát: ugyanazt az
 * eseményt kétszer nem dolgozzuk fel. Fizetési vitánál ez a nyers napló dönt.
 */

export default defineEventHandler(async (event) => {
  const rawBody = (await readRawBody(event, 'utf8')) ?? ''
  const signature = getHeader(event, 'stripe-signature') ?? null

  const provider = getPaymentProvider()
  const parsed = provider.verifyWebhook(rawBody, signature)

  if (!parsed) {
    throw createError({ statusCode: 400, statusMessage: 'Érvénytelen webhook aláírás.' })
  }

  // Idempotencia: ha már láttuk ezt az esemény-azonosítót, nyugtázunk és kilépünk.
  const existing = await prisma.paymentEvent.findUnique({
    where: { provider_providerEventId: { provider: 'STRIPE', providerEventId: parsed.id } },
  })
  if (existing) {
    return { received: true, duplicate: true }
  }

  const obj = parsed.data as Record<string, unknown>
  const providerPaymentId = typeof obj.id === 'string' ? obj.id : null

  const logEntry = await prisma.paymentEvent.create({
    data: {
      provider: 'STRIPE',
      providerEventId: parsed.id,
      providerPaymentId,
      eventType: parsed.type,
      payload: parsed as unknown as object,
      signatureOk: parsed.signatureOk,
    },
  })

  let processError: string | null = null
  try {
    if (parsed.type === 'setup_intent.succeeded') {
      const setupIntentId = typeof obj.id === 'string' ? obj.id : null
      if (setupIntentId) {
        const guarantee = await prisma.cardGuarantee.findUnique({ where: { setupIntentId } })
        if (guarantee && guarantee.status !== 'ACTIVE') {
          const state = await provider.getGuaranteeState(setupIntentId)
          await prisma.cardGuarantee.update({
            where: { id: guarantee.id },
            data: {
              status: state.status,
              paymentMethodId: state.paymentMethodId,
              cardBrand: state.cardBrand,
              cardLast4: state.cardLast4,
            },
          })
        }
      }
    }
    if (parsed.type === 'payment_intent.succeeded') {
      const paymentIntentId = typeof obj.id === 'string' ? obj.id : null
      if (paymentIntentId) {
        await finalizePaidCheckout(paymentIntentId)
      }
    }
  } catch (err) {
    processError = err instanceof Error ? err.message : String(err)
  }

  await prisma.paymentEvent.update({
    where: { id: logEntry.id },
    data: { processedAt: new Date(), processError },
  })

  return { received: true }
})
