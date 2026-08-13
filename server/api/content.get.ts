import { prisma } from '~~/server/utils/prisma'

/**
 * A weboldal szövegei kulcs -> érték formában.
 *
 * A frontend `t('home.hero.title', 'alapértelmezés')` alakban használja: ha egy
 * kulcs itt nem szerepel, a kódbeli alapértelmezés jelenik meg. Így egy
 * félresikerült szerkesztés sem tud üres oldalt eredményezni.
 */
export default defineCachedEventHandler(
  async (event) => {
    const locale = String(getQuery(event).locale ?? 'hu')
    const rows = await prisma.contentBlock.findMany({
      where: { locale },
      select: { key: true, value: true },
    })
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  },
  { maxAge: 60, name: 'content', getKey: (e) => String(getQuery(e).locale ?? 'hu') },
)
