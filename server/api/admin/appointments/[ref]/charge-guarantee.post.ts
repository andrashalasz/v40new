import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { getPaymentProvider } from '~~/server/utils/payments'

/**
 * A kártya-biztosíték megterhelése (jellemzően no-show / késői lemondás díja).
 *
 * Csak admin hívhatja. A folyamat:
 *  1. Az aktív biztosíték kártyáját off_session megterheljük a megadott összeggel.
 *  2. Sikeres terhelésnél Order + Payment (SUCCEEDED) rögzül a könyveléshez, és
 *     a biztosíték CHARGED státuszba kerül (a chargedPaymentId hivatkozással).
 *
 * Az összeget a szerver a foglalás árából (vagy a megadott felülírásból)
 * számolja – a kliens által küldött összegben nem bízunk vakon.
 */

const body = z.object({
  amountGross: z.number().int().positive().optional(), // felülírás (HUF, bruttó); alap: a foglalás ára
  reason: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const ref = getRouterParam(event, 'ref')
  if (!ref) throw createError({ statusCode: 400, statusMessage: 'Hiányzó azonosító.' })

  const { amountGross, reason } = await readValidatedBody(event, body.parse)

  const appointment = await prisma.appointment.findUnique({
    where: { publicRef: ref },
    include: { guarantee: true, user: true },
  })
  if (!appointment) throw createError({ statusCode: 404, statusMessage: 'A foglalás nem található.' })

  const guarantee = appointment.guarantee
  if (guarantee && guarantee.status === 'CHARGED') {
    throw createError({ statusCode: 409, statusMessage: 'A biztosíték már meg lett terhelve.' })
  }
  if (!guarantee || guarantee.status !== 'ACTIVE' || !guarantee.paymentMethodId) {
    throw createError({ statusCode: 409, statusMessage: 'Nincs terhelhető (aktív) kártya-biztosíték.' })
  }

  const settings = await prisma.clinicSettings.findUnique({ where: { id: 1 } })
  const currency = settings?.currency ?? 'HUF'
  // Alapértelmezett díj: a szolgáltatás árának a beállított %-a (no-show díj).
  const feePercent = settings?.noShowFeePercent ?? 50
  const amount = amountGross ?? Math.round((appointment.priceGross * feePercent) / 100)

  const provider = getPaymentProvider()
  const result = await provider.chargeGuarantee({
    customerRef: guarantee.customerRef,
    paymentMethodId: guarantee.paymentMethodId,
    // HUF nulladecimális pénznem a Stripe-nál -> a "minor" egység maga a forint.
    amountMinor: amount,
    currency,
    metadata: {
      appointmentId: String(appointment.id),
      publicRef: appointment.publicRef,
      reason: reason ?? 'no_show',
    },
  })

  if (result.status !== 'SUCCEEDED') {
    await prisma.cardGuarantee.update({
      where: { id: guarantee.id },
      data: { status: 'FAILED' },
    })
    throw createError({ statusCode: 402, statusMessage: `A terhelés sikertelen: ${result.failReason ?? 'ismeretlen'}` })
  }

  // Könyvelés: Order + Payment. A rendelésszám egyszerű, ütközésre az egyedi
  // idempotencyKey véd (providerPaymentId alapú).
  const order = await prisma.order.create({
    data: {
      orderNumber: `V40-NS-${appointment.publicRef}-${randomBytes(3).toString('hex')}`,
      userId: appointment.userId,
      status: 'PAID',
      totalGross: amount,
      currency,
      items: {
        create: {
          kind: 'SERVICE',
          appointmentId: appointment.id,
          serviceId: appointment.serviceId,
          titleSnapshot: reason ?? 'No-show / késői lemondás díja',
          quantity: 1,
          unitPriceGross: amount,
          vatRate: appointment.vatRate,
        },
      },
      payments: {
        create: {
          provider: guarantee.provider,
          providerPaymentId: result.providerPaymentId,
          status: 'SUCCEEDED',
          amountGross: amount,
          currency,
          idempotencyKey: `guarantee-charge-${result.providerPaymentId}`,
          paidAt: new Date(),
        },
      },
    },
    include: { payments: true },
  })

  await prisma.cardGuarantee.update({
    where: { id: guarantee.id },
    data: { status: 'CHARGED', chargedPaymentId: result.providerPaymentId },
  })

  return {
    ok: true,
    amountGross: amount,
    currency,
    orderNumber: order.orderNumber,
    providerPaymentId: result.providerPaymentId,
  }
})
