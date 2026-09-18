/**
 * Tartalom-exportáló: az adatbázis szöveges tartalmát (ContentBlock,
 * ServiceCategory, Translation) a prisma/content-export.json fájlba menti, hogy
 * a scripts/import-content.ts betölthesse egy másik (pl. éles) adatbázisba.
 * A fordítások SLUG alapú hivatkozással kerülnek ki (id-független).
 *
 * Használat:  npx tsx scripts/export-content.ts
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
const p = new PrismaClient()
;(async () => {
  const contentBlocks = await p.contentBlock.findMany({ orderBy: [{ key: 'asc' }, { locale: 'asc' }], select: { key: true, locale: true, page: true, group: true, label: true, type: true, value: true } })
  const categories = await p.serviceCategory.findMany({ orderBy: { sortOrder: 'asc' }, select: { slug: true, name: true, shortDesc: true, longDesc: true, iconUrl: true, heroImage: true, sortOrder: true, isActive: true, archivedAt: true } })
  // Foglalható kezelések (alap mezők + kategória slug). A szakember/szoba hozzárendelés az adminban.
  const svcRows = await p.service.findMany({ orderBy: { title: 'asc' }, select: { slug: true, title: true, lead: true, desc: true, gender: true, priceGross: true, vatRate: true, vatExemptReason: true, durationMin: true, isActive: true, isBookableOnline: true, sortOrder: true, category: { select: { slug: true } } } })
  const services = svcRows.map((s) => ({ ...s, categorySlug: s.category?.slug ?? null, category: undefined }))
  const ent = async (m: 'service' | 'serviceCategory' | 'practitioner' | 'passTemplate') =>
    Object.fromEntries((await (p[m] as { findMany: (a: unknown) => Promise<{ id: number; slug: string }[]> }).findMany({ select: { id: true, slug: true } })).map((x) => [x.id, x.slug]))
  const ref: Record<string, Record<number, string>> = { Service: await ent('service'), ServiceCategory: await ent('serviceCategory'), Practitioner: await ent('practitioner'), PassTemplate: await ent('passTemplate') }
  const trRows = await p.translation.findMany({ select: { entity: true, entityId: true, field: true, locale: true, value: true } })
  const translations = trRows.map((t) => ({ entity: t.entity, slug: ref[t.entity]?.[t.entityId] ?? null, field: t.field, locale: t.locale, value: t.value })).filter((t) => t.slug)
  writeFileSync(join(process.cwd(), 'prisma', 'content-export.json'), JSON.stringify({ contentBlocks, categories, services, translations }, null, 2))
  console.log(`Export: ${contentBlocks.length} szöveg, ${categories.length} kategória, ${services.length} kezelés, ${translations.length} fordítás.`)
  await p.$disconnect()
})()
