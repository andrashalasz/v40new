import { contentMap } from '~~/server/utils/i18n'

/**
 * A weboldal szövegei kulcs -> érték formában, a kért nyelven (magyar
 * visszaeséssel). A frontend `t('home.hero.title', 'alapértelmezés')` alakban
 * használja: ha egy kulcs itt nincs, a kódbeli alapértelmezés jelenik meg.
 */
export default defineCachedEventHandler(
  async (event) => {
    const locale = String(getQuery(event).locale ?? 'hu')
    return contentMap(locale)
  },
  { maxAge: 60, name: 'content', getKey: (e) => String(getQuery(e).locale ?? 'hu') },
)
