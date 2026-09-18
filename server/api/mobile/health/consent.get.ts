import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'
import { CATEGORIES } from '~~/server/health/catalog'

/**
 * A BEJELENTKEZETT felhasználó hozzájárulásai, kategóriánként.
 *
 * Miért kell külön lekérdezés: a hozzájárulás a FELHASZNÁLÓHOZ tartozik, nem a
 * készülékhez. Enélkül a képernyő minden induláskor „minden kikapcsolva"
 * állapotot mutatott, függetlenül attól, hogy a felhasználó korábban már
 * engedélyezte-e – és fiókváltás után sem derült ki, hogy az új fiókhoz még
 * nincs hozzájárulás. A szinkron ilyenkor lefutott, de a szerver minden
 * tételt elutasított, a felhasználó pedig csak annyit látott, hogy „nincs adat".
 *
 * Azt is visszaadjuk, hány napi érték érkezett eddig: ebből azonnal látszik,
 * hogy ez a fiók kapott-e már adatot, vagy egy másikra szinkronizáltak.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const [consents, metricCount, sync] = await Promise.all([
    prisma.healthConsent.findMany({
      where: { userId: user.id },
      select: { category: true, revokedAt: true, grantedAt: true },
    }),
    prisma.healthDailyMetric.count({ where: { userId: user.id } }),
    prisma.healthSyncState.findMany({
      where: { userId: user.id },
      select: { platform: true, lastSyncedDay: true, lastSyncAt: true },
    }),
  ])

  const byCategory = new Map(consents.map((c) => [c.category, c]))

  return {
    email: user.email,
    metricCount,
    sync,
    categories: CATEGORIES.map((c) => {
      const consent = byCategory.get(c.key)
      return {
        key: c.key,
        granted: !!consent && !consent.revokedAt,
        grantedAt: consent?.grantedAt ?? null,
        revokedAt: consent?.revokedAt ?? null,
      }
    }),
  }
})
