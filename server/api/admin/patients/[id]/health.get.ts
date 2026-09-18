import { prisma } from '~~/server/utils/prisma'
import { requireStaffOrDoctor } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'
import { CATEGORIES } from '~~/server/health/catalog'
import { compareAround, type DailyPoint } from '~~/server/health/compare'

/**
 * Egy páciens egészségügyi adatai az orvosnak, kategóriákba rendezve.
 *
 * HOZZÁFÉRÉS: staff, vagy a HOZZÁRENDELT orvos. Egy orvos nem nézheti meg
 * bárki adatát – ugyanaz a szabály, mint a szakvélemény-írásnál.
 *
 * A BETEKINTÉST naplózzuk. Egészségügyi adatnál ez nem formaság: egy esetleges
 * hatósági vizsgálatnál vagy páciensi panasznál igazolni kell tudni, ki mikor
 * mit nézett meg. (A szinkron maga nem naplózott – az naponta többször fut és
 * elárasztaná a naplót.)
 */
export default defineEventHandler(async (event) => {
  const me = await requireStaffOrDoctor(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })
  }

  if (me.role === 'DOCTOR') {
    const link = await prisma.patientDoctor.findFirst({
      where: { patientId: id, doctorId: me.id },
    })
    // Szándékosan 404: ne derüljön ki, hogy létezik-e ilyen páciens.
    if (!link) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const query = getQuery(event)

  // Hány napra visszamenőleg. Alapból 90 nap: elég hosszú a trendhez, de nem
  // annyi adat, hogy a diagram olvashatatlanná váljon.
  const days = Math.min(Math.max(Number(query.days ?? 90), 7), 730)

  // Összehasonlítás egy kezeléshez: az orvos kiválaszt egy foglalást, és a
  // körülötte lévő azonos hosszú ablakok átlagát veti össze.
  const compareAppointmentId = query.compare ? Number(query.compare) : null
  const compareWindow = Math.min(Math.max(Number(query.window ?? 14), 3), 90)

  const from = new Date(Date.now() - days * 86400_000)
  from.setUTCHours(0, 0, 0, 0)

  const [patient, consents, rows, sync, treatments, doctors] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, email: true, birthDate: true },
    }),
    prisma.healthConsent.findMany({
      where: { userId: id },
      select: { category: true, grantedAt: true, revokedAt: true },
    }),
    prisma.healthDailyMetric.findMany({
      where: { userId: id, day: { gte: from } },
      orderBy: { day: 'asc' },
      select: {
        metric: true,
        day: true,
        sum: true,
        avg: true,
        min: true,
        max: true,
        count: true,
        unit: true,
      },
    }),
    prisma.healthSyncState.findMany({
      where: { userId: id },
      select: { platform: true, lastSyncedDay: true, lastSyncAt: true },
    }),
    // A megtörtént kezelések – ezek közül választ az orvos az
    // összehasonlításhoz. A lemondott és a meg nem valósult foglalás nem
    // kerülhet a listába: azokhoz nincs mit hasonlítani.
    prisma.appointment.findMany({
      where: { userId: id, status: { in: ['CONFIRMED', 'COMPLETED'] }, startsAt: { lte: new Date() } },
      orderBy: { startsAt: 'desc' },
      take: 50,
      select: {
        id: true,
        startsAt: true,
        service: { select: { title: true } },
        practitioner: { select: { name: true } },
      },
    }),
    // Kik látják ezt a pácienst orvosként. Enélkül nem derül ki, MIÉRT nem
    // látja egy orvos az adatot: azért, mert nincs hozzárendelve.
    //
    // Fontos különbség, ami könnyen összekeverhető: a SZAKEMBER
    // (Practitioner) a foglaláshoz tartozik, és nem lép be a felületre. Az
    // ORVOS egy felhasználói fiók, DOCTOR szerepkörrel. Csak az utóbbi lát
    // egészségügyi adatot.
    prisma.patientDoctor.findMany({
      where: { patientId: id },
      select: {
        doctor: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
  ])

  if (!patient) throw createError({ statusCode: 404, statusMessage: 'A páciens nem található.' })

  await audit(event, me.id, 'health.viewed', 'User', id)

  // --- Összehasonlítás egy kezelés körül ------------------------------------
  //
  // Az összevetéshez KÜLÖN lekérdezés kell: a kezelés lehet régebbi, mint a
  // diagramon látható időszak, és a hozzá tartozó ablak kilóghat abból.
  const chosen = compareAppointmentId
    ? (treatments.find((t) => t.id === compareAppointmentId) ?? null)
    : null

  let compareRows: typeof rows = []
  let pivotDay: string | null = null

  if (chosen) {
    pivotDay = chosen.startsAt.toLocaleDateString('sv-SE', { timeZone: 'Europe/Budapest' })
    const windowFrom = new Date(chosen.startsAt.getTime() - compareWindow * 86400_000)
    const windowTo = new Date(chosen.startsAt.getTime() + compareWindow * 86400_000)
    windowFrom.setUTCHours(0, 0, 0, 0)
    windowTo.setUTCHours(0, 0, 0, 0)

    compareRows = await prisma.healthDailyMetric.findMany({
      where: { userId: id, day: { gte: windowFrom, lte: windowTo } },
      orderBy: { day: 'asc' },
      select: {
        metric: true,
        day: true,
        sum: true,
        avg: true,
        min: true,
        max: true,
        count: true,
        unit: true,
      },
    })
  }

  const compareByMetric = new Map<string, typeof compareRows>()
  for (const r of compareRows) {
    const list = compareByMetric.get(r.metric) ?? []
    list.push(r)
    compareByMetric.set(r.metric, list)
  }

  // Mérésenként csoportosítva, hogy a kliensnek ne kelljen újra végigmennie.
  const byMetric = new Map<string, typeof rows>()
  for (const r of rows) {
    const list = byMetric.get(r.metric) ?? []
    list.push(r)
    byMetric.set(r.metric, list)
  }

  const consentByCategory = new Map(consents.map((c) => [c.category, c]))

  /** Egy mérés sorozata + a szükséges összefoglaló számok. */
  const seriesOf = (metricKey: string, aggregation: string) => {
    const list = byMetric.get(metricKey) ?? []
    if (!list.length) return null

    // Melyik mezőt kell nézni, azt az összesítés módja dönti el: a lépés
    // összeadódik, a pulzus átlagolódik, a testsúly a nap utolsó mérése.
    const valueOf = (r: (typeof list)[number]) =>
      aggregation === 'sum' ? r.sum : aggregation === 'average' ? r.avg : (r.avg ?? r.max ?? r.sum)

    const points = list
      .map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        value: valueOf(r),
        min: r.min,
        max: r.max,
        count: r.count,
      }))
      .filter((p) => p.value !== null && p.value !== undefined)

    if (!points.length) return null

    const values = points.map((p) => p.value as number)
    const last = points[points.length - 1]

    // Trend: az utolsó és az azt megelőző azonos hosszú időszak átlagának
    // eltérése. Csak akkor számoljuk, ha mindkét felében van adat – különben
    // egy hiányos hét „javulásnak" látszana.
    const half = Math.floor(points.length / 2)
    const firstHalf = values.slice(0, half)
    const secondHalf = values.slice(half)
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
    const before = mean(firstHalf)
    const after = mean(secondHalf)

    return {
      points,
      summary: {
        latest: last?.value ?? null,
        latestDay: last?.day ?? null,
        average: mean(values),
        min: Math.min(...values),
        max: Math.max(...values),
        dayCount: points.length,
        /** Százalékos változás az időszak első feléhez képest, vagy null. */
        trendPercent:
          before !== null && after !== null && before !== 0 && half >= 3
            ? ((after - before) / Math.abs(before)) * 100
            : null,
      },
    }
  }

  /** Az adott mérés napi pontjai az összehasonlító ablakból. */
  const comparePointsOf = (metricKey: string, aggregation: string): DailyPoint[] =>
    (compareByMetric.get(metricKey) ?? [])
      .map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        value:
          aggregation === 'sum' ? r.sum : aggregation === 'average' ? r.avg : (r.avg ?? r.max ?? r.sum),
      }))
      .filter((p): p is DailyPoint => p.value !== null && p.value !== undefined)

  const categories = CATEGORIES.map((c) => {
    const consent = consentByCategory.get(c.key)
    const metrics = c.metrics
      .map((m) => {
        const series = seriesOf(m.key, m.aggregation)
        if (!series) return null

        const comparison = pivotDay
          ? compareAround(comparePointsOf(m.key, m.aggregation), pivotDay, compareWindow)
          : null

        return {
          key: m.key,
          label: m.label,
          unit: m.unit,
          chart: m.chart,
          decimals: m.decimals ?? 0,
          reference: m.reference ?? null,
          comparison,
          ...series,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)

    return {
      key: c.key,
      label: c.label,
      consent: consent
        ? {
            granted: !consent.revokedAt,
            grantedAt: consent.grantedAt,
            revokedAt: consent.revokedAt,
          }
        : null,
      metrics,
    }
  })

  return {
    patient,
    days,
    sync,
    treatments,
    doctors: doctors.map((d) => ({
      id: d.doctor.id,
      email: d.doctor.email,
      name: [d.doctor.lastName, d.doctor.firstName].filter(Boolean).join(' ') || d.doctor.email,
    })),
    /** Hány napi érték van összesen – a szűrt időszaktól függetlenül. */
    totalMetricCount: await prisma.healthDailyMetric.count({ where: { userId: id } }),
    compare: chosen
      ? {
          appointmentId: chosen.id,
          day: pivotDay,
          windowDays: compareWindow,
          title: chosen.service.title,
          practitioner: chosen.practitioner?.name ?? null,
        }
      : null,
    // Az üres kategóriákat is visszaadjuk, mert az orvosnak tudnia kell, hogy
    // egy adatkör azért hiányzik-e, mert nincs hozzájárulás, vagy mert a
    // páciens nem mér ilyet. A kettő orvosilag más következtetés.
    categories,
  }
})
