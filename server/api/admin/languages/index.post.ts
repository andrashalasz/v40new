import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'

/** Új nyelv felvétele. A tartalom AI-fordítását külön endpoint indítja. */
const body = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2}(-[a-z]{2})?$/, 'Kétbetűs nyelvi kód (pl. en, de).'),
  name: z.string().trim().min(1).max(60),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Érvénytelen adat.',
      data: { fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])) },
    })
  }
  const { code, name } = parsed.data

  const exists = await prisma.language.findUnique({ where: { code } })
  if (exists) {
    throw createError({ statusCode: 409, statusMessage: 'Ez a nyelv már létezik.' })
  }

  const max = await prisma.language.aggregate({ _max: { sortOrder: true } })
  const lang = await prisma.language.create({
    data: { code, name, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  })
  await audit(event, null, 'language.create', 'Language', lang.id, { code, name })

  return { ok: true, code: lang.code }
})
