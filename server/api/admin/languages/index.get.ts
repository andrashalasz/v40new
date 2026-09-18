import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const langs = await prisma.language.findMany({
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
  })
  // Fordítás-lefedettség: hány AI/kézi fordítás van nyelvenként.
  const counts = await prisma.translation.groupBy({
    by: ['locale'],
    _count: { _all: true },
  })
  const byLocale = Object.fromEntries(counts.map((c) => [c.locale, c._count._all]))
  return {
    items: langs.map((l) => ({
      code: l.code,
      name: l.name,
      isDefault: l.isDefault,
      isActive: l.isActive,
      sortOrder: l.sortOrder,
      translationCount: byLocale[l.code] ?? 0,
    })),
  }
})
