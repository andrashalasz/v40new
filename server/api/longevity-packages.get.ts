import { prisma } from '~~/server/utils/prisma'

/**
 * A Longevity diagnosztika csomag-összehasonlító táblázata (Basic/Komplex/Prémium).
 * A `longevity.packages` ContentBlock tárolja JSON-ként.
 */
export default defineCachedEventHandler(
  async (event) => {
    const locale = String(getQuery(event).locale ?? 'hu')
    const b =
      (locale !== 'hu'
        ? await prisma.contentBlock.findFirst({ where: { key: 'longevity.packages', locale }, select: { value: true } })
        : null) ?? (await prisma.contentBlock.findFirst({ where: { key: 'longevity.packages', locale: 'hu' }, select: { value: true } }))
    if (!b?.value) return { packages: [], rows: [] }
    try {
      return JSON.parse(b.value) as { packages: string[]; rows: { item: string; has: boolean[] }[] }
    } catch {
      return { packages: [], rows: [] }
    }
  },
  { maxAge: 120, name: 'longevity-packages', getKey: (e) => String(getQuery(e).locale ?? 'hu') },
)
