import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'

/** Nyelv módosítása (név, aktív állapot). Az alap nyelvet nem lehet kikapcsolni. */
const body = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const code = String(getRouterParam(event, 'code') ?? '').toLowerCase()
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Érvénytelen adat.' })

  const lang = await prisma.language.findUnique({ where: { code } })
  if (!lang) throw createError({ statusCode: 404, statusMessage: 'Nincs ilyen nyelv.' })
  if (lang.isDefault && parsed.data.isActive === false) {
    throw createError({ statusCode: 400, statusMessage: 'Az alap nyelvet nem lehet kikapcsolni.' })
  }

  await prisma.language.update({ where: { code }, data: parsed.data })
  await audit(event, null, 'language.update', 'Language', lang.id, parsed.data)
  return { ok: true }
})
