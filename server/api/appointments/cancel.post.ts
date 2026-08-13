import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'

/**
 * Foglalás lemondása.
 *
 * Két dolog történik, amit nem lehet elfelejteni:
 *  - a slotLock és a roomSlotLock NULL-ra áll, különben a felszabadult idősáv
 *    örökre blokkolt maradna,
 *  - bérletes foglalásnál az alkalom visszaíródik, de a levonás rekordja
 *    megmarad `reversedAt`-tel – így az elszámolás auditálható.
 */
const body = z.object({
  publicRef: z.string().min(4).max(32),
  reason: z.string().max(1000).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Érvénytelen adat.' })

  const settings = await prisma.clinicSettings.findUnique({ where: { id: 1 } })
  if (settings && !settings.allowOnlineCancellation && user.role === 'USER') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Az online lemondás ki van kapcsolva, kérjük hívj minket.',
    })
  }

  const appt = await prisma.appointment.findUnique({
    where: { publicRef: parsed.data.publicRef },
    include: { redemption: true },
  })
  if (!appt) throw createError({ statusCode: 404, statusMessage: 'A foglalás nem található.' })

  const isOwner = appt.userId === user.id
  const isStaff = user.role === 'ADMIN' || user.role === 'STAFF'
  if (!isOwner && !isStaff) {
    throw createError({ statusCode: 404, statusMessage: 'A foglalás nem található.' })
  }
  if (appt.status === 'CANCELLED') return { ok: true, alreadyCancelled: true }
  if (appt.status === 'COMPLETED') {
    throw createError({ statusCode: 409, statusMessage: 'Megtörtént kezelés nem mondható le.' })
  }

  const freeHours = settings?.freeCancellationHours ?? 24
  const hoursLeft = (appt.startsAt.getTime() - Date.now()) / 3_600_000
  const late = hoursLeft < freeHours

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appt.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledByUserId: user.id,
        cancellationReason: parsed.data.reason,
        slotLock: null,
        roomSlotLock: null,
      },
    })

    // Bérletes foglalásnál az alkalom visszaírása. Késői lemondásnál nem:
    // az ÁSZF szerint az elhasznált alkalomnak számít.
    if (appt.redemption && !appt.redemption.reversedAt && !(late && !isStaff)) {
      await tx.passRedemption.update({
        where: { id: appt.redemption.id },
        data: { reversedAt: new Date(), reversalReason: 'Lemondás – alkalom visszaírva.' },
      })
      await tx.customerPass.update({
        where: { id: appt.redemption.customerPassId },
        data: { sessionsRemaining: { increment: appt.redemption.sessionsUsed } },
      })
    }
  })

  await audit(event, user.id, 'appointment.cancel', 'Appointment', appt.id, {
    late,
    hoursLeft: Math.round(hoursLeft),
    byStaff: isStaff,
  })

  return {
    ok: true,
    late,
    passSessionReturned: Boolean(appt.redemption && !(late && !isStaff)),
    message: late
      ? `A lemondás a ${freeHours} órás határon belül történt, ezért díjköteles lehet.`
      : 'A foglalás díjmentesen lemondva.',
  }
})
