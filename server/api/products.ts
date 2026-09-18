import { prisma } from '~~/server/utils/prisma'
import { entityTranslations } from '~~/server/utils/i18n'

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

type SvcRow = {
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
}

/** A kezelés-sorokra ráolvassa a kért nyelvű fordítást (magyar visszaeséssel). */
async function localize<T extends SvcRow>(rows: T[], locale: string): Promise<T[]> {
  if (!locale || locale === 'hu' || !rows.length) return rows
  const svcTr = await entityTranslations('Service', rows.map((r) => r.id), locale)
  const catIds = [...new Set(rows.map((r) => r.category?.id).filter((x): x is number => !!x))]
  const catTr = await entityTranslations('ServiceCategory', catIds, locale)
  return rows.map((r) => ({
    ...r,
    title: svcTr[r.id]?.title ?? r.title,
    lead: svcTr[r.id]?.lead ?? r.lead,
    desc: svcTr[r.id]?.desc ?? r.desc,
    category: r.category
      ? { ...r.category, name: catTr[r.category.id]?.name ?? r.category.name }
      : null,
  }))
}

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Az írás az /api/admin/services útvonalon történik.',
    })
  }

  const query = getQuery(event)
  const locale = String(query.locale ?? 'hu')

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

    const [foundL, ...relatedL] = await localize([found, ...related], locale)
    return { product: toProduct(foundL!), related: relatedL.map(toProduct) }
  }

  // 2. Egy kezelés id alapján
  if (query.id) {
    const one = await loadOne({ id: Number(query.id) })
    if (!one) return null
    const [oneL] = await localize([one], locale)
    return toProduct(oneL!)
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

  return (await localize(rows, locale)).map(toProduct)
})
