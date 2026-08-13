import { prisma } from '~~/server/utils/prisma'
import { requireCronSecret } from '~~/server/utils/guard'

/**
 * Lejárt zárolások felszabadítása.
 *
 * Enélkül az elhagyott fizetések örökre lefoglalnák az idősávokat, és a naptár
 * fokozatosan tele lenne szellemfoglalással.
 *
 * A slotLock és a roomSlotLock NULL-ra állítása a fontos rész: a nullable
 * egyedi kulcs több NULL-t megenged, tehát az idősáv ezzel válik újra
 * foglalhatóvá. A rekordot nem töröljük – az elhagyott foglalási kísérlet
 * önmagában is hasznos információ.
 *
 * cPanel cron, 5 percenként:
 *   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" \
 *        https://v40vital.hu/api/cron/release-holds
 */
export default defineEventHandler(async (event) => {
  requireCronSecret(event)

  const now = new Date()
  const expired = await prisma.appointment.findMany({
    where: { status: 'HOLD', holdUntil: { lt: now } },
    select: { id: true, publicRef: true },
  })

  if (!expired.length) return { ok: true, released: 0 }

  const ids = expired.map((a) => a.id)
  await prisma.appointment.updateMany({
    where: { id: { in: ids } },
    data: {
      status: 'CANCELLED',
      cancelledAt: now,
      cancellationReason: 'A fizetésre adott zárolás lejárt.',
      slotLock: null,
      roomSlotLock: null,
    },
  })

  await prisma.auditLog.create({
    data: {
      action: 'appointment.hold.expired',
      entity: 'Appointment',
      meta: { ids, refs: expired.map((a) => a.publicRef) },
    },
  })

  return { ok: true, released: ids.length }
})
