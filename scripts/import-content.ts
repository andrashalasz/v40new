/**
 * Tartalom-betöltő: a prisma/content-export.json alapján feltölti a szövegeket
 * (ContentBlock), a kezeléstípusokat (ServiceCategory) és az adatbázis-tartalom
 * fordításait (Translation). Idempotens – többször is lefuttatható.
 *
 * Használat (a `npm run seed` UTÁN):
 *   npx tsx scripts/import-content.ts
 *
 * A fordításokat SLUG alapján kötjük az entitásokhoz, ezért független attól,
 * milyen numerikus id-t kaptak a kezelések/orvosok/bérletek a seed során.
 */
import { PrismaClient, type ContentType } from '@prisma/client'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const prisma = new PrismaClient()

interface Export {
  contentBlocks: { key: string; locale: string; page: string; group: string | null; label: string; type: string; value: string }[]
  categories: { slug: string; name: string; shortDesc: string | null; longDesc: unknown; iconUrl: string | null; heroImage?: string | null; sortOrder: number; isActive: boolean; archivedAt: string | null }[]
  services?: { slug: string; title: string; lead: string | null; desc: string; gender: string; priceGross: number; vatRate: number; vatExemptReason: string | null; durationMin: number; isActive: boolean; isBookableOnline: boolean; sortOrder: number; categorySlug: string | null }[]
  translations: { entity: string; slug: string; field: string; locale: string; value: string }[]
}

async function main() {
  const data = JSON.parse(readFileSync(join(process.cwd(), 'prisma', 'content-export.json'), 'utf8')) as Export

  // 1) Szövegblokkok
  for (const b of data.contentBlocks) {
    await prisma.contentBlock.upsert({
      where: { key_locale: { key: b.key, locale: b.locale } },
      create: { key: b.key, locale: b.locale, page: b.page, group: b.group, label: b.label, type: b.type as ContentType, value: b.value },
      update: { value: b.value, page: b.page, group: b.group, label: b.label, type: b.type as ContentType },
    })
  }

  // 2) Kezeléstípusok (slug szerint)
  for (const c of data.categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, shortDesc: c.shortDesc, longDesc: c.longDesc as never, iconUrl: c.iconUrl, heroImage: c.heroImage ?? null, sortOrder: c.sortOrder, isActive: c.isActive, archivedAt: c.archivedAt ? new Date(c.archivedAt) : null },
      update: { name: c.name, shortDesc: c.shortDesc, longDesc: c.longDesc as never, iconUrl: c.iconUrl, heroImage: c.heroImage ?? null, sortOrder: c.sortOrder, isActive: c.isActive, archivedAt: c.archivedAt ? new Date(c.archivedAt) : null },
    })
  }

  // 2b) Foglalható kezelések (slug szerint). Létrehozáskor minden mező; frissítéskor
  //     CSAK a leíró mezők – az árat/időtartamot/aktív állapotot az admin kezeli, nem írjuk felül.
  let svcNew = 0
  for (const s of data.services ?? []) {
    const catId = s.categorySlug
      ? (await prisma.serviceCategory.findUnique({ where: { slug: s.categorySlug }, select: { id: true } }))?.id ?? null
      : null
    const existing = await prisma.service.findUnique({ where: { slug: s.slug }, select: { id: true } })
    if (existing) {
      // A leíró mezők + a láthatóság (aktív/foglalható/sorrend) FELÜLÍRÓDIK az
      // exportból, hogy az aktiválás deploykor is átmenjen. Az árat/időtartamot
      // NEM írjuk felül – azt az admin kezeli (különben a beállított ár 0-ra állna).
      await prisma.service.update({ where: { slug: s.slug }, data: { title: s.title, lead: s.lead, desc: s.desc, gender: s.gender, categoryId: catId, isActive: s.isActive, isBookableOnline: s.isBookableOnline, sortOrder: s.sortOrder } })
    } else {
      await prisma.service.create({ data: { slug: s.slug, title: s.title, lead: s.lead, desc: s.desc, gender: s.gender, priceGross: s.priceGross, vatRate: s.vatRate, vatExemptReason: s.vatExemptReason, durationMin: s.durationMin, isActive: s.isActive, isBookableOnline: s.isBookableOnline, sortOrder: s.sortOrder, categoryId: catId } })
      svcNew++
    }
  }

  // 3) Entitás-fordítások (slug -> id feloldással)
  const maps: Record<string, Record<string, number>> = {
    Service: Object.fromEntries((await prisma.service.findMany({ select: { id: true, slug: true } })).map((x) => [x.slug, x.id])),
    ServiceCategory: Object.fromEntries((await prisma.serviceCategory.findMany({ select: { id: true, slug: true } })).map((x) => [x.slug, x.id])),
    Practitioner: Object.fromEntries((await prisma.practitioner.findMany({ select: { id: true, slug: true } })).map((x) => [x.slug, x.id])),
    PassTemplate: Object.fromEntries((await prisma.passTemplate.findMany({ select: { id: true, slug: true } })).map((x) => [x.slug, x.id])),
  }
  let trOk = 0, trSkip = 0
  for (const t of data.translations) {
    const id = maps[t.entity]?.[t.slug]
    if (!id) { trSkip++; continue }
    await prisma.translation.upsert({
      where: { entity_entityId_field_locale: { entity: t.entity, entityId: id, field: t.field, locale: t.locale } },
      create: { entity: t.entity, entityId: id, field: t.field, locale: t.locale, value: t.value },
      update: { value: t.value },
    })
    trOk++
  }

  console.log(`Tartalom betöltve: ${data.contentBlocks.length} szöveg, ${data.categories.length} kezeléstípus, ${svcNew} új kezelés, ${trOk} fordítás (${trSkip} kihagyva – hiányzó slug).`)
  await prisma.$disconnect()
}
main()
