import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import { audit } from '~~/server/utils/audit'
import { overlaps, toBusyBlocks } from '~~/server/booking/availability'
import { sendAppointmentEmail } from '~~/server/utils/notifications'

/**
 * Idősáv zárolása (HOLD).
 *
 * Ez a rendszer egyetlen valóban versenyhelyzetes pontja: ha ketten egyszerre
 * kattintanak a felkínált 10:00-ra, pontosan egyiküknek kell megkapnia.
 *
 * Három védelmi réteg van, szándékosan:
 *
 *  1. Tranzakció + `SELECT ... FOR UPDATE` az érintett időablakra. A MySQL
 *     REPEATABLE READ mellett résre is zárol (gap lock), így a párhuzamos
 *     INSERT megvárja az elsőt.
 *  2. `slotLock` egyedi kulcs (szakember + kezdés) és `roomSlotLock` (szoba +
 *     kezdés). Ha a zárolási logikában valaha hiba lenne, az adatbázis akkor is
 *     visszautasítja a másodikat. Lemondáskor NULL-ra állnak, tehát a
 *     felszabadult idősáv újra foglalható.
 *  3. Az idősáv ÚJRASZÁMOLÁSA a szerveren. A kliens által küldött időpontban
 *     soha nem bízunk: ha nem szerepel a felkínálható sávok között, elutasítjuk.
 */

const body = z.object({
  serviceId: z.number().int().positive(),
  practitionerId: z.number().int().positive(),
  startsAt: z.coerce.date(),
  // Háromféle rendezés van, és nem ugyanaz a végállapotuk:
  //  ONLINE_CARD -> HOLD, a fizetésre várva (lejár, ha nem fizet)
  //  PASS        -> azonnal CONFIRMED, egy alkalom levonva a bérletből
  //  ON_SITE     -> azonnal CONFIRMED, a díj a rendelőben fizetendő
  settlement: z.enum(['ONLINE_CARD', 'PASS', 'ON_SITE']).default('ONLINE_CARD'),
  customer: z
    .object({
      lastName: z.string().min(1).max(100),
      firstName: z.string().min(1).max(100),
      email: z.string().email().max(200),
      phone: z.string().min(6).max(40),
    })
    .optional(),
  note: z.string().max(2000).optional(),
})

const BLOCKING = ['HOLD', 'PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'NO_SHOW'] as const

/** Ügyfélnek mutatott azonosító. Nem sorszám, hogy ne lehessen kitalálni. */
const publicRef = () =>
  'V40-' +
  randomBytes(4)
    .toString('base64url')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6)

export default defineEventHandler(async (event) => {
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Érvénytelen adat.',
      data: { fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])) },
    })
  }
  const { serviceId, practitionerId, startsAt, customer, note, settlement } = parsed.data

  const session = await getUserSession(event)
  const sessionUserId = (session?.user as { id?: number } | undefined)?.id
  if (!sessionUserId && !customer) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Add meg az elérhetőségeidet, vagy jelentkezz be.',
    })
  }

  const settings = await prisma.clinicSettings.findUnique({ where: { id: 1 } })
  const holdMinutes = settings?.holdMinutes ?? 15

  const service = await prisma.service.findFirst({
    where: { id: serviceId, archivedAt: null, isActive: true, isBookableOnline: true },
    include: { rooms: { include: { room: true } } },
  })
  if (!service) {
    throw createError({ statusCode: 404, statusMessage: 'A kezelés nem foglalható online.' })
  }

  const link = await prisma.servicePractitioner.findUnique({
    where: { serviceId_practitionerId: { serviceId, practitionerId } },
    include: { practitioner: true },
  })
  if (!link || !link.practitioner.isActive || link.practitioner.archivedAt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A választott szakember nem végzi ezt a kezelést.',
    })
  }

  // --- 3. réteg: a felkínálhatóság újraszámolása ---------------------------
  // Ugyanazt a motort hívjuk, mint a lista, ugyanarra a napra. Ha a kért
  // időpont nem jön ki, akkor vagy elavult a kliens, vagy manipulált a kérés.
  const dayFrom = new Date(startsAt.getTime() - 12 * 3_600_000)
  const dayTo = new Date(startsAt.getTime() + 12 * 3_600_000)
  const offered = await $fetch<{
    practitioners: { practitionerId: number; slots: { start: string; roomId: number | null }[] }[]
  }>('/api/availability', {
    query: {
      serviceId,
      practitionerId,
      from: dayFrom.toISOString(),
      to: dayTo.toISOString(),
    },
  }).catch(() => null)

  const match = offered?.practitioners
    ?.find((p) => p.practitionerId === practitionerId)
    ?.slots.find((s) => new Date(s.start).getTime() === startsAt.getTime())

  if (!match) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ez az időpont már nem elérhető. Kérlek válassz másikat.',
    })
  }

  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000)
  const occupied = {
    start: new Date(startsAt.getTime() - service.bufferBeforeMin * 60_000),
    end: new Date(endsAt.getTime() + service.bufferAfterMin * 60_000),
  }
  const roomId = match.roomId

  // --- ügyfél: bejelentkezve vagy automatikus fiók -------------------------
  let userId = sessionUserId
  if (!userId && customer) {
    // Jelszó nélküli fiók: a foglaláshoz nem kell jelszót kitalálni, de a
    // bérlet és a foglalási előzmény így is kaphat tulajdonost.
    const user = await prisma.user.upsert({
      where: { email: customer.email.toLowerCase() },
      update: {
        lastName: customer.lastName,
        firstName: customer.firstName,
        phone: customer.phone,
      },
      create: {
        email: customer.email.toLowerCase(),
        lastName: customer.lastName,
        firstName: customer.firstName,
        phone: customer.phone,
        privacyAcceptedAt: new Date(),
      },
      select: { id: true },
    })
    userId = user.id
  }

  const holdUntil = new Date(Date.now() + holdMinutes * 60_000)
  const iso = startsAt.toISOString()

  try {
    const appointment = await prisma.$transaction(
      async (tx) => {
        // --- 1. réteg: zárolás az érintett időablakra --------------------
        // A résekre is kiterjedő zárolás miatt párhuzamos INSERT nem tud
        // becsúszni, amíg ez a tranzakció le nem zárul.
        const lockFrom = new Date(occupied.start.getTime() - 4 * 3_600_000)
        const lockTo = new Date(occupied.end.getTime() + 4 * 3_600_000)

        const rows = await tx.$queryRaw<
          {
            id: number
            practitionerId: number
            roomId: number | null
            startsAt: Date
            endsAt: Date
            status: string
            holdUntil: Date | null
            bufferBeforeMin: number
            bufferAfterMin: number
          }[]
        >`
          SELECT a.id, a.practitionerId, a.roomId, a.startsAt, a.endsAt, a.status,
                 a.holdUntil, s.bufferBeforeMin, s.bufferAfterMin
          FROM Appointment a
          JOIN Service s ON s.id = a.serviceId
          WHERE a.startsAt < ${lockTo}
            AND a.endsAt   > ${lockFrom}
            AND (a.practitionerId = ${practitionerId}
                 ${roomId !== null ? Prisma.sql`OR a.roomId = ${roomId}` : Prisma.empty})
          FOR UPDATE
        `

        const now = new Date()
        const conflicts = (filter: (r: (typeof rows)[number]) => boolean) =>
          toBusyBlocks(
            rows.filter(filter).map((r) => ({
              startsAt: r.startsAt,
              endsAt: r.endsAt,
              bufferBeforeMin: r.bufferBeforeMin,
              bufferAfterMin: r.bufferAfterMin,
              status: r.status as never,
              holdUntil: r.holdUntil,
            })),
            now,
          ).some((b) => overlaps(occupied, b))

        if (conflicts((r) => r.practitionerId === practitionerId)) {
          throw createError({ statusCode: 409, statusMessage: 'A szakember időközben foglalt lett.' })
        }
        if (roomId !== null && conflicts((r) => r.roomId === roomId)) {
          throw createError({ statusCode: 409, statusMessage: 'A szoba időközben foglalt lett.' })
        }

        // --- bérletből fizetés: az alkalom keresése és levonása -----------
        // A tranzakción BELÜL, hogy két párhuzamos foglalás ne vonhassa le
        // ugyanazt a maradék alkalmat.
        let pass: { id: number; sessionsRemaining: number | null } | null = null
        if (settlement === 'PASS') {
          const covering = await tx.customerPass.findFirst({
            where: {
              userId: userId!,
              status: 'ACTIVE',
              validFrom: { lte: startsAt },
              validUntil: { gte: startsAt },
              OR: [{ sessionsRemaining: { gt: 0 } }, { sessionsRemaining: null }],
              passTemplate: { services: { some: { serviceId } } },
            },
            // A leghamarabb lejáró bérletet használjuk fel először, hogy ne
            // veszítsen el az ügyfél alkalmat.
            orderBy: { validUntil: 'asc' },
            select: { id: true, sessionsRemaining: true },
          })
          if (!covering) {
            throw createError({
              statusCode: 409,
              statusMessage: 'Nincs erre a kezelésre érvényes, felhasználható bérleted.',
            })
          }
          pass = covering
        }

        // --- 2. réteg: egyedi kulcsok ------------------------------------
        const confirmed = settlement !== 'ONLINE_CARD'
        const appointment = await tx.appointment.create({
          data: {
            publicRef: publicRef(),
            userId: userId!,
            serviceId,
            practitionerId,
            roomId,
            startsAt,
            endsAt,
            status: confirmed ? 'CONFIRMED' : 'HOLD',
            settlement,
            holdUntil: confirmed ? null : holdUntil,
            slotLock: `${practitionerId}:${iso}`,
            roomSlotLock: roomId !== null ? `${roomId}:${iso}` : null,
            priceGross: service.priceGross,
            vatRate: service.vatRate,
            customerNote: note,
          },
          select: { id: true, publicRef: true, startsAt: true, endsAt: true, holdUntil: true },
        })

        if (pass) {
          const sessionsPerUse =
            (
              await tx.passTemplateService.findFirst({
                where: { serviceId, passTemplate: { passes: { some: { id: pass.id } } } },
                select: { sessionsPerUse: true },
              })
            )?.sessionsPerUse ?? 1

          await tx.passRedemption.create({
            data: {
              customerPassId: pass.id,
              appointmentId: appointment.id,
              sessionsUsed: sessionsPerUse,
            },
          })

          if (pass.sessionsRemaining !== null) {
            const left = pass.sessionsRemaining - sessionsPerUse
            if (left < 0) {
              throw createError({
                statusCode: 409,
                statusMessage: 'A bérleten nincs elég maradék alkalom ehhez a kezeléshez.',
              })
            }
            await tx.customerPass.update({
              where: { id: pass.id },
              data: {
                sessionsRemaining: left,
                status: left === 0 ? 'EXHAUSTED' : 'ACTIVE',
              },
            })
          }
        }

        return appointment
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 10_000 },
    )

    await audit(event, userId ?? null, `appointment.${settlement.toLowerCase()}`, 'Appointment', appointment.id, {
      settlement,
      serviceId,
      practitionerId,
      roomId,
      startsAt: iso,
    })

    // Visszaigazoló e-mail a megerősített foglalásokról (ON_SITE / PASS). Az
    // ONLINE_CARD egyelőre HOLD, arról a fizetés után megy majd értesítés.
    // Fire-and-forget: az e-mail hibája ne buktassa meg magát a foglalást.
    if (settlement !== 'ONLINE_CARD') {
      void sendAppointmentEmail(appointment.id, 'booking.confirmed').catch((e) =>
        console.error('[notifications] visszaigazoló e-mail hiba:', e),
      )
    }

    return {
      ok: true,
      publicRef: appointment.publicRef,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      holdUntil: appointment.holdUntil,
      priceGross: service.priceGross,
      holdMinutes,
      settlement,
      // ONLINE_CARD esetén a kliensnek még a fizetésre kell mennie
      needsPayment: settlement === 'ONLINE_CARD',
    }
  } catch (err) {
    // Ha a zárolás valamiért átengedte, az egyedi kulcs itt fogja meg.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Ezt az időpontot épp most foglalta le valaki más.',
      })
    }
    throw err
  }
})
