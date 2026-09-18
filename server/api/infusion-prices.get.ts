import { prisma } from '~~/server/utils/prisma'

/**
 * Az infúziós árlista (név, alcím, ár). A tétellistát az `infuzio.pricelist`
 * ContentBlock tárolja JSON-ként (adminból szerkeszthető). Az árak nyelvfüggetlenek.
 */
export default defineCachedEventHandler(
  async (event) => {
    const locale = String(getQuery(event).locale ?? 'hu')
    const block =
      (locale !== 'hu'
        ? await prisma.contentBlock.findFirst({ where: { key: 'infuzio.pricelist', locale }, select: { value: true } })
        : null) ?? (await prisma.contentBlock.findFirst({ where: { key: 'infuzio.pricelist', locale: 'hu' }, select: { value: true } }))
    if (!block?.value) return { items: [] }
    try {
      const items = JSON.parse(block.value) as { name: string; subtitle: string; price: number }[]
      return { items: Array.isArray(items) ? items : [] }
    } catch {
      return { items: [] }
    }
  },
  { maxAge: 120, name: 'infusion-prices', getKey: (e) => String(getQuery(e).locale ?? 'hu') },
)
