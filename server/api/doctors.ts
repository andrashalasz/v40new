import { prisma } from '~~/server/utils/prisma'
import { entityTranslations } from '~~/server/utils/i18n'

/**
 * KOMPATIBILITÁSI RÉTEG – /api/doctors
 *
 * A Doctor modellt a Practitioner váltotta fel (slug, titulus, kezelés-
 * hozzárendelés, beosztás). A Doctors.vue és a Doctors2.vue viszont a régi
 * alakra épül, ezért a mezőneveket megtartjuk.
 *
 * Csak OLVASÁS. Az írás az /api/admin/practitioners útvonalon történik.
 */
const select = {
  id: true,
  slug: true,
  name: true,
  titles: true,
  category: true,
  desc: true,
  picUrl: true,
} as const

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Az írás az /api/admin/practitioners útvonalon történik.',
    })
  }

  const query = getQuery(event)
  const locale = String(query.locale ?? 'hu')
  const where = { archivedAt: null, isActive: true } as const

  // A titulus, a kategória és a bemutatkozó fordítható (a név nem).
  type Doc = { id: number; titles: string | null; category: string | null; desc: string | null }
  async function localize<T extends Doc>(rows: T[]): Promise<T[]> {
    if (!locale || locale === 'hu' || !rows.length) return rows
    const tr = await entityTranslations('Practitioner', rows.map((r) => r.id), locale)
    return rows.map((r) => ({
      ...r,
      titles: tr[r.id]?.titles ?? r.titles,
      category: tr[r.id]?.category ?? r.category,
      desc: tr[r.id]?.desc ?? r.desc,
    }))
  }

  if (query.id) {
    const one = await prisma.practitioner.findFirst({ where: { ...where, id: Number(query.id) }, select })
    if (!one) return one
    const [oneL] = await localize([one])
    return oneL
  }

  const rows = await prisma.practitioner.findMany({ where, select, orderBy: { name: 'asc' } })
  return localize(rows)
})
