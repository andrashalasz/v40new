import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'

const body = z.object({
  locale: z.string().min(2).max(8).default('hu'),
  // Csak az érték módosítható. A key/page/group szerkezet a kódhoz tartozik:
  // ha az admin átírhatná, a frontend hivatkozása némán elszakadna.
  values: z.array(z.object({ key: z.string().min(1), value: z.string().max(20_000) })).min(1),
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Érvénytelen adat.' })
  }
  const { locale, values } = parsed.data

  const known = await prisma.contentBlock.findMany({
    where: { locale, key: { in: values.map((v) => v.key) } },
    select: { key: true },
  })
  const knownKeys = new Set(known.map((k) => k.key))
  const unknown = values.filter((v) => !knownKeys.has(v.key)).map((v) => v.key)
  if (unknown.length) {
    throw createError({
      statusCode: 422,
      statusMessage: `Ismeretlen szövegkulcs: ${unknown.join(', ')}`,
    })
  }

  await prisma.$transaction(
    values.map((v) =>
      prisma.contentBlock.update({
        where: { key_locale: { key: v.key, locale } },
        data: { value: v.value, updatedBy: admin.id },
      }),
    ),
  )

  await audit(event, admin.id, 'content.update', 'ContentBlock', null, {
    keys: values.map((v) => v.key),
  })
  return { ok: true, updated: values.length }
})
