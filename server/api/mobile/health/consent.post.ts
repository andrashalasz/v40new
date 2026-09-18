import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'
import { CATEGORY_KEYS } from '~~/server/health/catalog'

/**
 * Hozzájárulás megadása vagy visszavonása EGY adatkategóriához.
 *
 * A visszavonáskor a sort NEM töröljük, csak `revokedAt`-et állítunk: a GDPR
 * elszámoltathatósági elve szerint igazolnunk kell tudni, hogy mikor mihez
 * volt hozzájárulás. A már beszinkronizált adat sorsáról külön kell dönteni –
 * lásd alább.
 */
const body = z.object({
  category: z.string().refine((c) => CATEGORY_KEYS.includes(c), 'Ismeretlen kategória.'),
  granted: z.boolean(),
  platform: z.enum(['ios', 'android']).optional(),
  /**
   * Visszavonáskor: törölje-e a rendszer a kategória eddig beszinkronizált
   * adatait is. Az app kérdezi meg a felhasználót, mert ez a döntés az övé –
   * a visszavonás önmagában a JÖVŐRE szól, a múltbeli adat orvosi
   * dokumentáció része lehet.
   */
  deleteExisting: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Hiányzó vagy hibás adatok!' })
  }
  const { category, granted, platform, deleteExisting } = parsed.data

  if (granted) {
    await prisma.healthConsent.upsert({
      where: { userId_category: { userId: user.id, category } },
      update: { grantedAt: new Date(), revokedAt: null, platform: platform ?? null },
      create: { userId: user.id, category, platform: platform ?? null },
    })
    await audit(event, user.id, 'health.consent.granted', 'HealthConsent', user.id)
    return { category, granted: true }
  }

  await prisma.healthConsent.updateMany({
    where: { userId: user.id, category, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  let deleted = 0
  if (deleteExisting) {
    const { METRIC_BY_KEY } = await import('~~/server/health/catalog')
    const metrics = [...METRIC_BY_KEY.entries()]
      .filter(([, v]) => v.category.key === category)
      .map(([key]) => key)

    const res = await prisma.healthDailyMetric.deleteMany({
      where: { userId: user.id, metric: { in: metrics } },
    })
    deleted = res.count
  }

  await audit(event, user.id, 'health.consent.revoked', 'HealthConsent', user.id)
  return { category, granted: false, deleted }
})
