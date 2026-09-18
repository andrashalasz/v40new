import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * Több nyelvű szöveg-módosítások mentése egy menetben.
 * body: { changes: [{ key, locale, value }] }
 * A kulcsnak léteznie kell valamelyik nyelven (a page/group/label onnan öröklődik).
 */
const body = z.object({
  changes: z.array(z.object({ key: z.string().min(1), locale: z.string().min(2).max(5), value: z.string().max(8000) })).max(5000),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { changes } = await readValidatedBody(event, body.parse)

  let updated = 0
  for (const c of changes) {
    // meta (page/group/label/type) egy meglévő sorból
    const meta = await prisma.contentBlock.findFirst({ where: { key: c.key }, select: { page: true, group: true, label: true, type: true } })
    if (!meta) continue
    await prisma.contentBlock.upsert({
      where: { key_locale: { key: c.key, locale: c.locale } },
      create: { key: c.key, locale: c.locale, page: meta.page, group: meta.group, label: meta.label, type: meta.type, value: c.value },
      update: { value: c.value },
    })
    updated++
  }
  return { ok: true, updated }
})
