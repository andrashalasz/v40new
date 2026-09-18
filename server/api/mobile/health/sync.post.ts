import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'
import { categoryOfMetric, METRIC_BY_KEY } from '~~/server/health/catalog'

/**
 * Napi összesítések feltöltése a telefonról.
 *
 * Az app végzi az összesítést, mert a nyers minták a készüléken vannak, és
 * feltölteni őket egyszerre lenne pazarló (egy év pulzusadat több százezer
 * minta) és GDPR szempontból indokolatlan. A szerver napi bontású értéket kap.
 *
 * IDEMPOTENS: ugyanaz a (mérés, nap) újraküldve felülírja a korábbit. Az app
 * ezért nyugodtan újraküldheti az utolsó néhány napot – az óra gyakran
 * utólag pótol adatot, és így az is bekerül.
 *
 * A HOZZÁJÁRULÁST minden tételnél ellenőrizzük. Nem elég az appban ellenőrizni:
 * egy régi appverzió vagy egy hibás kliens olyan kategóriát is küldhetne,
 * amihez a felhasználó időközben visszavonta az engedélyt.
 */

const sample = z.object({
  metric: z.string().max(64),
  /** "2026-09-18" – a RENDELŐ időzónája szerinti nap, az app számolja. */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sum: z.number().finite().optional(),
  avg: z.number().finite().optional(),
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  count: z.number().int().min(0).max(1_000_000).optional(),
})

const body = z.object({
  platform: z.enum(['ios', 'android']),
  /** Egy kérésben legfeljebb ennyi tétel – a kliens adagolja. */
  samples: z.array(sample).max(2000),
})

const SOURCE = { ios: 'apple_health', android: 'health_connect' } as const

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Érvénytelen adat.',
      data: { issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) },
    })
  }
  const { platform, samples } = parsed.data

  // Az ÉRVÉNYES hozzájárulások egyetlen lekérdezésben.
  const consents = await prisma.healthConsent.findMany({
    where: { userId: user.id, revokedAt: null },
    select: { category: true },
  })
  const allowed = new Set(consents.map((c) => c.category))

  let written = 0
  const rejected: { metric: string; reason: string }[] = []
  let latestDay: string | null = null

  for (const s of samples) {
    const entry = METRIC_BY_KEY.get(s.metric)
    if (!entry) {
      rejected.push({ metric: s.metric, reason: 'ismeretlen mérés' })
      continue
    }

    const category = categoryOfMetric(s.metric)
    if (!category || !allowed.has(category)) {
      rejected.push({ metric: s.metric, reason: 'nincs érvényes hozzájárulás' })
      continue
    }

    // Üres tétel: nincs mit tárolni. Nem hiba, csak kihagyjuk – így az app
    // nem kap zajos hibalistát olyan napokra, amelyeken nem volt mérés.
    if (s.sum === undefined && s.avg === undefined && s.min === undefined && s.max === undefined) {
      continue
    }

    const day = new Date(`${s.day}T00:00:00Z`)

    await prisma.healthDailyMetric.upsert({
      where: { userId_metric_day: { userId: user.id, metric: s.metric, day } },
      update: {
        sum: s.sum ?? null,
        avg: s.avg ?? null,
        min: s.min ?? null,
        max: s.max ?? null,
        count: s.count ?? 0,
        unit: entry.metric.unit,
        source: SOURCE[platform],
      },
      create: {
        userId: user.id,
        metric: s.metric,
        day,
        sum: s.sum ?? null,
        avg: s.avg ?? null,
        min: s.min ?? null,
        max: s.max ?? null,
        count: s.count ?? 0,
        unit: entry.metric.unit,
        source: SOURCE[platform],
      },
    })
    written++
    if (!latestDay || s.day > latestDay) latestDay = s.day
  }

  if (latestDay) {
    const lastSyncedDay = new Date(`${latestDay}T00:00:00Z`)
    await prisma.healthSyncState.upsert({
      where: { userId_platform: { userId: user.id, platform } },
      update: { lastSyncedDay },
      create: { userId: user.id, platform, lastSyncedDay },
    })
  }

  // A szinkron NEM kerül az auditnaplóba: naponta többször fut, és elárasztaná
  // a pénzügyi és jogosultsági bejegyzéseket. A hozzájárulás megadása és
  // visszavonása viszont naplózott, és az orvosi BETEKINTÉS is az lesz.
  return { written, rejected: rejected.slice(0, 20), rejectedCount: rejected.length }
})
