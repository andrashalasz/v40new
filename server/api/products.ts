import { prisma } from '~~/server/utils/prisma'

/**
 * KOMPATIBILITÁSI RÉTEG – /api/products
 *
 * A Product modell megszűnt, a helyét a Service vette át (tárolt slug,
 * kezelés-szintű áfa, pufferek, szoba- és szakember-kapcsolat). A publikus
 * frontend viszont 12 helyen erre az endpointra és a régi mezőnevekre épül
 * (Search.vue, szolgaltatas/[slug].vue, kalkulacio.vue, Longevity stb.).
 *
 * Ezért a válasz alakja szándékosan változatlan: a Service rekordokat a régi
 * Product mezőnevekre képezzük le. Így az arculat és a komponensek egy sor
 * módosítás nélkül működnek tovább.
 *
 * Csak OLVASÁS. Az írás az /api/admin/services útvonalon történik, Zod
 * validálással, jogosultság-ellenőrzéssel és auditnaplóval – a korábbi
 * verzióban ezek nem voltak meg.
 */

const select = {
  id: true,
  slug: true,
  title: true,
  lead: true,
  desc: true,
  gender: true,
  priceGross: true,
  vatRate: true,
  durationMin: true,
  picUrl: true,
  sortOrder: true,
  category: { select: { id: true, name: true, slug: true } },
} as const

/** Service -> a régi Product alak. */
function toProduct(s: {
  id: number
  slug: string
  title: string
  lead: string | null
  desc: string
  gender: string
  priceGross: number
  vatRate: number
  durationMin: number
  picUrl: string | null
  category: { id: number; name: string; slug: string } | null
}) {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    lead: s.lead,
    desc: s.desc,
    // A régi mezőnév a típus szöveges neve volt, nem azonosító
    type: s.category?.name ?? null,
    gender: s.gender,
    price: s.priceGross,
    picUrl: s.picUrl,
    time: s.durationMin,
    // Új, hasznos információk – a régi kliensek egyszerűen nem olvassák
    vatRate: s.vatRate,
    categorySlug: s.category?.slug ?? null,
  }
}

const PUBLIC = { archivedAt: null, isActive: true } as const

function loadOne(where: Record<string, unknown>) {
  return prisma.service.findFirst({ where: { ...PUBLIC, ...where }, select })
}

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Az írás az /api/admin/services útvonalon történik.',
    })
  }

  const query = getQuery(event)

  // 1. Egy kezelés slug alapján, a hasonlókkal együtt
  if (query.slug) {
    // A slug mostantól tárolt oszlop, nem a címből generált: a cím átírása
    // többé nem szakítja el az URL-t és nem törli a SEO-t.
    const found = await loadOne({ slug: String(query.slug) })
    if (!found) {
      throw createError({ statusCode: 404, statusMessage: 'A kezelés nem található' })
    }

    const related = await prisma.service.findMany({
      where: {
        ...PUBLIC,
        NOT: { id: found.id },
        ...(found.category ? { categoryId: found.category.id } : {}),
      },
      select,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      take: 4,
    })

    return { product: toProduct(found), related: related.map(toProduct) }
  }

  // 2. Egy kezelés id alapján
  if (query.id) {
    const one = await loadOne({ id: Number(query.id) })
    return one ? toProduct(one) : null
  }

  // 3. Lista, opcionálisan típus szerint szűrve (a szűrő a típus NEVÉT küldi)
  const type = query.type ? String(query.type) : null
  const rows = await prisma.service.findMany({
    where: {
      ...PUBLIC,
      ...(type && type !== 'Minden' ? { category: { name: type } } : {}),
    },
    select,
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  })

  return rows.map(toProduct)
})
