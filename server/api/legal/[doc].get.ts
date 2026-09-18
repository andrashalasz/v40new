import { prisma } from '~~/server/utils/prisma'

/**
 * Egy jogi dokumentum (ÁSZF / Adatvédelmi) HTML-törzse a kért nyelven, magyar
 * visszaeséssel. A tartalmat a `<doc>.body` RICHTEXT ContentBlock tárolja
 * (adminból szerkeszthető). Csak a whitelistázott dokumentumok érhetők el.
 */
const ALLOWED: Record<string, string> = {
  aszf: 'aszf.body',
  adatvedelmi: 'adatvedelmi.body',
  longevity: 'longevity.body',
}

export default defineCachedEventHandler(
  async (event) => {
    const doc = String(getRouterParam(event, 'doc') ?? '')
    const key = ALLOWED[doc]
    if (!key) throw createError({ statusCode: 404, statusMessage: 'Ismeretlen dokumentum.' })
    const locale = String(getQuery(event).locale ?? 'hu')
    const block =
      (locale !== 'hu'
        ? await prisma.contentBlock.findFirst({ where: { key, locale }, select: { value: true } })
        : null) ?? (await prisma.contentBlock.findFirst({ where: { key, locale: 'hu' }, select: { value: true } }))
    return { html: block?.value ?? '' }
  },
  { maxAge: 300, name: 'legal-doc', getKey: (e) => `${getRouterParam(e, 'doc')}:${getQuery(e).locale ?? 'hu'}` },
)
