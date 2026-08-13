import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'

/**
 * A bejelentkezett ügyfél foglalásai és bérletei a /fiok oldalhoz.
 *
 * Csak a saját adatát adja vissza: a szűrés a session felhasználójára történik,
 * nem kliens által küldött azonosítóra.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const [profile, appointments, passes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, firstName: true, lastName: true, phone: true },
    }),
    prisma.appointment.findMany({
      where: {
        userId: user.id,
        // A lejárt zárolások nem érdeklik az ügyfelet
        status: { in: ['HOLD', 'PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
      },
      orderBy: { startsAt: 'desc' },
      select: {
        publicRef: true,
        startsAt: true,
        endsAt: true,
        status: true,
        settlement: true,
        priceGross: true,
        holdUntil: true,
        service: { select: { title: true, slug: true, durationMin: true } },
        practitioner: { select: { name: true } },
        room: { select: { name: true } },
      },
    }),
    prisma.customerPass.findMany({
      where: { userId: user.id, status: { in: ['ACTIVE', 'EXHAUSTED'] } },
      orderBy: { validUntil: 'asc' },
      select: {
        code: true,
        sessionsTotal: true,
        sessionsRemaining: true,
        validFrom: true,
        validUntil: true,
        status: true,
        passTemplate: {
          select: {
            title: true,
            services: { select: { service: { select: { title: true, slug: true } } } },
          },
        },
      },
    }),
  ])

  const now = Date.now()
  return {
    profile,
    upcoming: appointments.filter((a) => a.startsAt.getTime() >= now),
    past: appointments.filter((a) => a.startsAt.getTime() < now),
    passes: passes.map((p) => ({
      ...p,
      services: p.passTemplate.services.map((s) => s.service),
      passTemplate: { title: p.passTemplate.title },
    })),
  }
})
