import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * Egy DB-tartalom fordítás mentése (entity, id, mező, nyelv, érték). A `longDesc`
 * mezőt üres sorok mentén bekezdésekre bontjuk, és `longDesc.0`, `longDesc.1`, …
 * mezőkként tároljuk (a régi bekezdéseket előbb töröljük). Üres érték = a
 * fordítás törlése (visszaesik a magyarra).
 */
const body = z.object({
  entity: z.enum(['Service', 'ServiceCategory', 'Practitioner', 'PassTemplate']),
  entityId: z.number().int().positive(),
  field: z.enum(['title', 'desc', 'name', 'shortDesc', 'category', 'longDesc']),
  locale: z.enum(['en', 'de']),
  value: z.string().max(8000),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { entity, entityId, field, locale, value } = await readValidatedBody(event, body.parse)
  const v = value.trim()

  if (field === 'longDesc') {
    // A meglévő longDesc.N mezők törlése, majd az új bekezdések beírása.
    await prisma.translation.deleteMany({
      where: { entity, entityId, locale, field: { startsWith: 'longDesc.' } },
    })
    const paras = v ? v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : []
    for (let i = 0; i < paras.length; i++) {
      await prisma.translation.create({
        data: { entity, entityId, field: `longDesc.${i}`, locale, value: paras[i]! },
      })
    }
    return { ok: true, paragraphs: paras.length }
  }

  const where = { entity_entityId_field_locale: { entity, entityId, field, locale } }
  if (!v) {
    await prisma.translation.deleteMany({ where: { entity, entityId, field, locale } })
    return { ok: true, cleared: true }
  }
  await prisma.translation.upsert({
    where,
    create: { entity, entityId, field, locale, value: v },
    update: { value: v },
  })
  return { ok: true }
})
