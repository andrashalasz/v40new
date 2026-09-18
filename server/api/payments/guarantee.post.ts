import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { getPaymentProvider } from '~~/server/utils/payments'

/**
 * Kártya-biztosíték indítása egy foglaláshoz.
 *
 * A foglalás után a kliens ezzel az endpointtal kér SetupIntentet. A kártyát a
 * böngésző közvetlenül a Stripe felé adja meg (Elements) – ide nyers kártyaadat
 * SOHA nem érkezik. Válaszul a clientSecretet adjuk vissza a kártya-űrlaphoz.
 *
 * Hitelesítés: a foglalás publicRef-je a hozzáférési kulcs (ahogy a foglalás
 * visszaigazolásánál is). Vendégfoglaló nincs bejelentkezve, ezért itt sem
 * követelünk session-t; a publicRef véletlenszerű és egyedi.
 */

const body = z.object({
  publicRef: z.string().min(4),
})

export default defineEventHandler(async (event) => {
  const { publicRef } = await readValidatedBody(event, body.parse)

  const appointment = await prisma.appointment.findUnique({
    where: { publicRef },
    include: { user: true, guarantee: true },
  })

  if (!appointment) {
    throw createError({ statusCode: 404, statusMessage: 'A foglalás nem található.' })
  }

  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
    throw createError({ statusCode: 409, statusMessage: 'Ehhez a foglaláshoz már nem rögzíthető biztosíték.' })
  }

  // Már aktív biztosíték – nincs teendő, ne indítsunk új SetupIntentet.
  if (appointment.guarantee && appointment.guarantee.status === 'ACTIVE') {
    return {
      alreadyActive: true,
      cardBrand: appointment.guarantee.cardBrand,
      cardLast4: appointment.guarantee.cardLast4,
    }
  }

  const provider = getPaymentProvider()
  const setup = await provider.createGuaranteeSetup({
    email: appointment.user.email,
    name: [appointment.user.lastName, appointment.user.firstName].filter(Boolean).join(' ') || null,
    metadata: {
      appointmentId: String(appointment.id),
      publicRef: appointment.publicRef,
    },
  })

  await prisma.cardGuarantee.upsert({
    where: { appointmentId: appointment.id },
    create: {
      appointmentId: appointment.id,
      provider: setup.provider,
      customerRef: setup.customerRef,
      setupIntentId: setup.setupIntentId,
      status: 'PENDING',
    },
    update: {
      provider: setup.provider,
      customerRef: setup.customerRef,
      setupIntentId: setup.setupIntentId,
      status: 'PENDING',
    },
  })

  return {
    alreadyActive: false,
    mock: setup.mock,
    setupIntentId: setup.setupIntentId,
    clientSecret: setup.clientSecret,
    publishableKey: setup.publishableKey,
  }
})
