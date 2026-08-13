import { prisma } from '~~/server/utils/prisma'

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
  const where = { archivedAt: null, isActive: true } as const

  if (query.id) {
    return prisma.practitioner.findFirst({
      where: { ...where, id: Number(query.id) },
      select,
    })
  }

  return prisma.practitioner.findMany({ where, select, orderBy: { name: 'asc' } })
})
