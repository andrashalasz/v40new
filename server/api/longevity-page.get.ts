import { prisma } from '~~/server/utils/prisma'

/**
 * A /longevity oldal két HTML-törzse (intro + after) a kért nyelven, magyar
 * visszaeséssel. A közéjük eső interaktív „szolgáltatásaink" szekciót a frontend
 * rendereli. A tartalmat a longevity.intro / longevity.after RICHTEXT
 * ContentBlockok tárolják (adminból szerkeszthető).
 */
async function block(key: string, locale: string): Promise<string> {
  const b =
    (locale !== 'hu'
      ? await prisma.contentBlock.findFirst({ where: { key, locale }, select: { value: true } })
      : null) ?? (await prisma.contentBlock.findFirst({ where: { key, locale: 'hu' }, select: { value: true } }))
  return b?.value ?? ''
}

export default defineCachedEventHandler(
  async (event) => {
    const locale = String(getQuery(event).locale ?? 'hu')
    const [intro, after] = await Promise.all([block('longevity.intro', locale), block('longevity.after', locale)])
    return { intro, after }
  },
  { maxAge: 300, name: 'longevity-page', getKey: (e) => String(getQuery(e).locale ?? 'hu') },
)
