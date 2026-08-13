import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import {
  computeFreeSlotsWithRooms,
  toBusyBlocks,
  type Interval,
  type WorkingHoursRule,
} from '~~/server/booking/availability'

/**
 * Szabad idősávok egy kezelésre.
 *
 * A számítást a tesztelt motor végzi (server/booking/availability.ts); ez az
 * endpoint csak összeszedi neki az adatot. Fontos, hogy a rendelő nyitvatartása
 * és a szakember beosztása METSZETBEN érvényes, ezért mindkettőt átadjuk.
 */

const query = z.object({
  serviceId: z.coerce.number().int().positive(),
  practitionerId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date(),
  to: z.coerce.date(),
})

/** ClinicHours -> a motor WorkingHoursRule formátuma (szakember nélkül). */
const asRules = (rows: { weekday: number; startMinute: number; endMinute: number }[]) =>
  rows.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute }))

/**
 * A rendelő nyitvatartása és a szakember beosztása közös szabálylistája.
 *
 * A motor egy sávlistát vár, ezért itt képezzük a metszetet: minden napra a
 * két beosztás átlapoló szakaszait adjuk vissza.
 */
function intersectRules(
  clinic: WorkingHoursRule[],
  pract: WorkingHoursRule[],
): WorkingHoursRule[] {
  const out: WorkingHoursRule[] = []
  for (const c of clinic) {
    for (const p of pract) {
      if (p.weekday !== c.weekday) continue
      // A szakember beosztásának érvényességi ablakát megtartjuk
      const startMinute = Math.max(c.startMinute, p.startMinute)
      const endMinute = Math.min(c.endMinute, p.endMinute)
      if (endMinute > startMinute) {
        out.push({
          weekday: c.weekday,
          startMinute,
          endMinute,
          validFrom: p.validFrom,
          validTo: p.validTo,
        })
      }
    }
  }
  return out
}

export default defineEventHandler(async (event) => {
  const parsed = query.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Hibás lekérdezés.' })
  }
  const { serviceId, practitionerId, from, to } = parsed.data

  // Legfeljebb 60 nap egy kérésben – enélkül egy tág intervallum megterhelné a
  // szervert, és az ügyfélnek sincs értelme egyszerre többet mutatni.
  if (to.getTime() - from.getTime() > 60 * 86_400_000) {
    throw createError({ statusCode: 400, statusMessage: 'Legfeljebb 60 napos időszak kérdezhető.' })
  }

  const [settings, service, clinicHours] = await Promise.all([
    prisma.clinicSettings.findUnique({ where: { id: 1 } }),
    prisma.service.findFirst({
      where: { id: serviceId, archivedAt: null, isActive: true, isBookableOnline: true },
      include: {
        rooms: { include: { room: true } },
        practitioners: { include: { practitioner: true } },
      },
    }),
    prisma.clinicHours.findMany(),
  ])

  if (!service) {
    throw createError({ statusCode: 404, statusMessage: 'A kezelés nem foglalható online.' })
  }

  const eligiblePractitioners = service.practitioners
    .map((sp) => sp.practitioner)
    .filter((p) => p.isActive && !p.archivedAt)
    .filter((p) => !practitionerId || p.id === practitionerId)

  if (!eligiblePractitioners.length) {
    return { serviceId, slots: [], reason: 'Ehhez a kezeléshez nincs elérhető szakember.' }
  }

  const eligibleRoomIds = service.rooms
    .map((sr) => sr.room)
    .filter((r) => r.isActive && !r.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((r) => r.id)

  const now = new Date()
  // A puffer miatt a szomszédos foglalások is beleszólnak, ezért szélesebb
  // ablakot kérdezünk, mint a vizsgált intervallum.
  const pad = 6 * 3_600_000
  const windowStart = new Date(from.getTime() - pad)
  const windowEnd = new Date(to.getTime() + pad)

  const [appointments, closures, timeOffRows] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        startsAt: { lt: windowEnd },
        endsAt: { gt: windowStart },
        OR: [
          { practitionerId: { in: eligiblePractitioners.map((p) => p.id) } },
          ...(eligibleRoomIds.length ? [{ roomId: { in: eligibleRoomIds } }] : []),
        ],
      },
      select: {
        practitionerId: true,
        roomId: true,
        startsAt: true,
        endsAt: true,
        status: true,
        holdUntil: true,
        service: { select: { bufferBeforeMin: true, bufferAfterMin: true } },
      },
    }),
    prisma.clinicClosure.findMany({
      where: { startsAt: { lt: windowEnd }, endsAt: { gt: windowStart } },
    }),
    prisma.timeOff.findMany({
      where: {
        practitionerId: { in: eligiblePractitioners.map((p) => p.id) },
        startsAt: { lt: windowEnd },
        endsAt: { gt: windowStart },
      },
    }),
  ])

  const toExisting = (a: (typeof appointments)[number]) => ({
    startsAt: a.startsAt,
    endsAt: a.endsAt,
    bufferBeforeMin: a.service.bufferBeforeMin,
    bufferAfterMin: a.service.bufferAfterMin,
    status: a.status,
    holdUntil: a.holdUntil,
  })

  // Szobánkénti foglaltság: a lemondott és a lejárt zárolás itt sem blokkol.
  const busyByRoom: Record<number, Interval[]> = {}
  for (const id of eligibleRoomIds) {
    busyByRoom[id] = toBusyBlocks(
      appointments.filter((a) => a.roomId === id).map(toExisting),
      now,
    )
  }

  const clinicRules = asRules(clinicHours)
  const allWorking = await prisma.workingHours.findMany({
    where: { practitionerId: { in: eligiblePractitioners.map((p) => p.id) } },
  })

  const closureIntervals: Interval[] = closures.map((c) => ({ start: c.startsAt, end: c.endsAt }))

  // Szakemberenkénti csoportosítás egyszer, előre – a korábbi változat minden
  // szabályhoz újra végigszűrte a teljes listát.
  const workingByPractitioner = new Map<number, WorkingHoursRule[]>()
  for (const w of allWorking) {
    const list = workingByPractitioner.get(w.practitionerId) ?? []
    list.push({
      weekday: w.weekday,
      startMinute: w.startMinute,
      endMinute: w.endMinute,
      validFrom: w.validFrom,
      validTo: w.validTo,
    })
    workingByPractitioner.set(w.practitionerId, list)
  }

  const perPractitioner = eligiblePractitioners.map((p) => {
    const practRules = workingByPractitioner.get(p.id) ?? []

    const slots = computeFreeSlotsWithRooms({
      from,
      to,
      now,
      service: {
        durationMin: service.durationMin,
        bufferBeforeMin: service.bufferBeforeMin,
        bufferAfterMin: service.bufferAfterMin,
        minLeadTimeHours: service.minLeadTimeHours,
        maxLeadTimeDays: service.maxLeadTimeDays,
      },
      workingHours: intersectRules(clinicRules, practRules),
      timeOff: timeOffRows
        .filter((t) => t.practitionerId === p.id)
        .map((t) => ({ start: t.startsAt, end: t.endsAt })),
      closures: closureIntervals,
      busy: toBusyBlocks(
        appointments.filter((a) => a.practitionerId === p.id).map(toExisting),
        now,
      ),
      slotGranularityMin: settings?.slotGranularityMin ?? 15,
      requireBuffersInsideHours: settings?.requireBuffersInsideHours ?? false,
      rooms: { eligibleRoomIds, busyByRoom },
    })

    return {
      practitionerId: p.id,
      practitionerName: p.name,
      slots: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        roomId: s.roomId,
      })),
    }
  })

  return {
    serviceId,
    durationMin: service.durationMin,
    priceGross: service.priceGross,
    vatRate: service.vatRate,
    holdMinutes: settings?.holdMinutes ?? 15,
    practitioners: perPractitioner,
  }
})
