import { prisma } from '~~/server/utils/prisma'
import { entityTranslations } from '~~/server/utils/i18n'

/**
 * KOMPATIBILITÁSI RÉTEG – /api/products/types
 *
 * A ServiceCategory tábla a forrás. A szűrő továbbra is a magyar kategórianévvel
 * dolgozik (a /api/products a `category.name`-re szűr), de a MEGJELENÍTETT címke
 * a kért nyelven jön. Ezért objektumot adunk vissza: { value, label }.
 *   - value: magyar név (stabil szűrőkulcs)
 *   - label: a kért nyelvű név (magyar visszaeséssel)
 *
 * Csak azokat a típusokat adjuk vissza, amelyekhez van legalább egy élő,
 * aktív kezelés – különben a szűrőben üres kategóriák jelennének meg.
 */
export default defineCachedEventHandler(
  async (event) => {
    const locale = String(getQuery(event).locale ?? 'hu')
    const rows = await prisma.serviceCategory.findMany({
      where: {
        isActive: true,
        services: { some: { archivedAt: null, isActive: true } },
      },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    const tr = await entityTranslations('ServiceCategory', rows.map((r) => r.id), locale)
    return rows.map((r) => ({ value: r.name, label: tr[r.id]?.name ?? r.name }))
  },
  { maxAge: 120, name: 'product-types', getKey: (e) => String(getQuery(e).locale ?? 'hu') },
)
