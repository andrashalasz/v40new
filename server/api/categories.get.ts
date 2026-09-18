import { prisma } from '~~/server/utils/prisma'
import { entityTranslations, paragraphsFromFields } from '~~/server/utils/i18n'

/**
 * Publikus kezelés-típusok a nyitóoldali felugró ablakokhoz, a kért nyelven
 * (magyar visszaeséssel). A `longDesc` a felugró bekezdés-tömbje.
 */
export default defineCachedEventHandler(
  async (event) => {
    const locale = String(getQuery(event).locale ?? 'hu')
    const rows = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, iconUrl: true, heroImage: true, shortDesc: true, longDesc: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    const tr = await entityTranslations('ServiceCategory', rows.map((r) => r.id), locale)

    // Formázott felugró-törzs (Word-szerű HTML) a catbody.<slug> blokkokból,
    // a kért nyelven, magyar visszaeséssel.
    const keys = rows.map((r) => `catbody.${r.slug}`)
    const huBodies = await prisma.contentBlock.findMany({ where: { key: { in: keys }, locale: 'hu' }, select: { key: true, value: true } })
    const bodyMap = new Map(huBodies.map((b) => [b.key, b.value]))
    if (locale !== 'hu') {
      const locBodies = await prisma.contentBlock.findMany({ where: { key: { in: keys }, locale }, select: { key: true, value: true } })
      for (const b of locBodies) bodyMap.set(b.key, b.value)
    }

    return rows.map((r) => {
      const t = tr[r.id]
      const translatedParas = paragraphsFromFields(t)
      return {
        slug: r.slug,
        name: t?.name ?? r.name,
        iconUrl: r.iconUrl,
        heroImage: r.heroImage,
        shortDesc: t?.shortDesc ?? r.shortDesc,
        body: bodyMap.get(`catbody.${r.slug}`) ?? '',
        paragraphs: translatedParas ?? (Array.isArray(r.longDesc) ? (r.longDesc as string[]) : []),
      }
    })
  },
  { maxAge: 120, name: 'categories', getKey: (e) => String(getQuery(e).locale ?? 'hu') },
)
