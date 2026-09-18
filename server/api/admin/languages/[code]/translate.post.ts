import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'
import { translateLanguage } from '~~/server/utils/i18n'
import { translatorConfigured } from '~~/server/utils/translate'

/**
 * A nyelv teljes tartalmának AI-fordítása a magyar alapból. Idempotens –
 * bármikor újrafuttatható. Ha nincs ANTHROPIC_API_KEY, "mock" módban fut (az
 * eredeti magyar szöveget menti), hogy a folyamat kulcs nélkül is látszódjon.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const code = String(getRouterParam(event, 'code') ?? '').toLowerCase()

  const lang = await prisma.language.findUnique({ where: { code } })
  if (!lang) throw createError({ statusCode: 404, statusMessage: 'Nincs ilyen nyelv.' })
  if (lang.isDefault) {
    throw createError({ statusCode: 400, statusMessage: 'Az alap nyelvet nem kell fordítani.' })
  }

  const result = await translateLanguage(code, lang.name)
  await audit(event, null, 'language.translate', 'Language', lang.id, result)

  return { ok: true, mock: !translatorConfigured(), ...result }
})
