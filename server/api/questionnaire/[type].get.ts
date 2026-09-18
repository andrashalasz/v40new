import { prisma } from '~~/server/utils/prisma'

/**
 * Egy kérdőív definíciója (szekciók + kérdések). A definíciót a
 * `kerdoiv.<type>` ContentBlock tárolja JSON-ként (adminból szerkeszthető).
 */
export default defineCachedEventHandler(
  async (event) => {
    const type = String(getRouterParam(event, 'type') ?? '').replace(/[^a-z0-9-]/gi, '')
    const locale = String(getQuery(event).locale ?? 'hu')
    // A kért nyelvű definíció, magyar visszaeséssel.
    const block =
      (locale !== 'hu'
        ? await prisma.contentBlock.findFirst({ where: { key: `kerdoiv.${type}`, locale }, select: { value: true } })
        : null) ?? (await prisma.contentBlock.findFirst({ where: { key: `kerdoiv.${type}`, locale: 'hu' }, select: { value: true } }))
    if (!block?.value) throw createError({ statusCode: 404, statusMessage: 'A kérdőív nem található.' })
    try {
      return JSON.parse(block.value)
    } catch {
      throw createError({ statusCode: 500, statusMessage: 'Hibás kérdőív-definíció.' })
    }
  },
  { maxAge: 120, name: 'questionnaire-def', getKey: (e) => `${getRouterParam(e, 'type') ?? ''}:${getQuery(e).locale ?? 'hu'}` },
)
