import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { getPaymentProvider } from '~~/server/utils/payments'

/**
 * Kártya-biztosíték véglegesítése.
 *
 * Miután a kliens a Stripe felé megerősítette a SetupIntentet (megadta a
 * kártyát), ez az endpoint lekérdezi a szolgáltatótól a végleges állapotot és
 * elmenti a kártya törzsadatait (márka, utolsó 4 jegy) + a paymentMethod
 * hivatkozását. Éles Stripe-nál a `setup_intent.succeeded` webhook is elvégzi
 * ezt – a kettő idempotens, a végállapot ugyanaz.
 */

const body = z.object({
  publicRef: z.string().min(4),
})

export default defineEventHandler(async (event) => {
  const { publicRef } = await readValidatedBody(event, body.parse)

  const appointment = await prisma.appointment.findUnique({
    where: { publicRef },
    include: { guarantee: true },
  })

  if (!appointment || !appointment.guarantee) {
    throw createError({ statusCode: 404, statusMessage: 'Nincs elindított biztosíték ehhez a foglaláshoz.' })
  }

  const guarantee = appointment.guarantee
  if (!guarantee.setupIntentId) {
    throw createError({ statusCode: 409, statusMessage: 'Hiányzó SetupIntent.' })
  }

  const provider = getPaymentProvider()
  const state = await provider.getGuaranteeState(guarantee.setupIntentId)

  const updated = await prisma.cardGuarantee.update({
    where: { id: guarantee.id },
    data: {
      status: state.status,
      paymentMethodId: state.paymentMethodId,
      cardBrand: state.cardBrand,
      cardLast4: state.cardLast4,
    },
  })

  return {
    status: updated.status,
    cardBrand: updated.cardBrand,
    cardLast4: updated.cardLast4,
  }
})
