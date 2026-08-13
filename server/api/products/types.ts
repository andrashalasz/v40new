import { prisma } from '~~/server/utils/prisma'

/**
 * KOMPATIBILITÁSI RÉTEG – /api/products/types
 *
 * A régi verzió a Product.type szabad szöveges mező distinct értékeit adta
 * vissza. Mostantól a ServiceCategory tábla a forrás, de a válasz továbbra is
 * egyszerű string tömb, hogy a Search.vue szűrője változatlan maradhasson.
 *
 * Csak azokat a típusokat adjuk vissza, amelyekhez van legalább egy élő,
 * aktív kezelés – különben a szűrőben üres kategóriák jelennének meg.
 */
export default defineCachedEventHandler(
  async () => {
    const rows = await prisma.serviceCategory.findMany({
      where: {
        isActive: true,
        services: { some: { archivedAt: null, isActive: true } },
      },
      select: { name: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return rows.map((r) => r.name)
  },
  { maxAge: 120, name: 'product-types' },
)
