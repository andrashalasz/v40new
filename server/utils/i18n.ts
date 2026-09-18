import { prisma } from './prisma'
import { translateBatch } from './translate'

/**
 * Többnyelvűség feloldó réteg + AI-fordítási pipeline.
 *
 * Az alap nyelv a magyar: az eredeti mezők a saját tábláikban maradnak, a többi
 * nyelv a Translation táblába kerül. Ha egy fordítás hiányzik, a magyarra esünk
 * vissza – így egy hiányzó fordítás sosem eredményez üres oldalt.
 */

export const DEFAULT_LOCALE = 'hu'

/** Szövegblokkok kulcs→érték a kért nyelven, magyar visszaeséssel. */
export async function contentMap(locale: string): Promise<Record<string, string>> {
  // A 'legal' oldal nagy HTML-blokkjai (ÁSZF, Adatvédelmi) NEM kerülnek a
  // globális szövegtérképbe – külön endpoint szolgálja ki őket, hogy ne
  // hízlalják minden oldal hidratálási payloadját.
  const base = await prisma.contentBlock.findMany({
    where: { locale: DEFAULT_LOCALE, page: { not: 'legal' } },
    select: { key: true, value: true },
  })
  const map: Record<string, string> = Object.fromEntries(base.map((r) => [r.key, r.value]))
  if (locale && locale !== DEFAULT_LOCALE) {
    const loc = await prisma.contentBlock.findMany({
      where: { locale, page: { not: 'legal' } },
      select: { key: true, value: true },
    })
    for (const r of loc) map[r.key] = r.value
  }
  return map
}

/** Egy entitás fordításai: { [id]: { [mező]: érték } } a kért nyelven. */
export async function entityTranslations(
  entity: string,
  ids: number[],
  locale: string,
): Promise<Record<number, Record<string, string>>> {
  if (!locale || locale === DEFAULT_LOCALE || !ids.length) return {}
  const rows = await prisma.translation.findMany({
    where: { entity, entityId: { in: ids }, locale },
    select: { entityId: true, field: true, value: true },
  })
  const out: Record<number, Record<string, string>> = {}
  for (const r of rows) (out[r.entityId] ??= {})[r.field] = r.value
  return out
}

/** A `longDesc.0`, `longDesc.1`, ... mezőkből visszaállítja a bekezdés-tömböt. */
export function paragraphsFromFields(fields: Record<string, string> | undefined): string[] | null {
  if (!fields) return null
  const keys = Object.keys(fields)
    .filter((k) => k.startsWith('longDesc.'))
    .sort((a, b) => Number(a.slice(9)) - Number(b.slice(9)))
  if (!keys.length) return null
  return keys.map((k) => fields[k] ?? '')
}

// ---------------------------------------------------------------------------
//  AI-fordítási pipeline: egy nyelv teljes feltöltése a magyar tartalomból.
// ---------------------------------------------------------------------------

interface Job {
  text: string
  apply: (translated: string) => Promise<void>
}

const CHUNK = 40

/**
 * Egy nyelv teljes lefordítása a magyar alapból: szövegblokkok + katalógus
 * (kezelés, típus, bérlet nevek/leírások) + orvos-szakterület/bemutatkozás.
 * A tulajdonneveket (orvos neve) NEM fordítjuk. Idempotens: felülírja a
 * korábbi AI-fordításokat.
 */
export async function translateLanguage(
  locale: string,
  languageName: string,
): Promise<{ contentBlocks: number; translations: number }> {
  if (locale === DEFAULT_LOCALE) return { contentBlocks: 0, translations: 0 }

  const jobs: Job[] = []
  let translationCount = 0

  // --- Szövegblokkok ---
  const blocks = await prisma.contentBlock.findMany({
    where: { locale: DEFAULT_LOCALE },
    select: { key: true, value: true, page: true, group: true, label: true },
  })
  for (const b of blocks) {
    jobs.push({
      text: b.value,
      apply: async (t) => {
        await prisma.contentBlock.upsert({
          where: { key_locale: { key: b.key, locale } },
          update: { value: t },
          create: { key: b.key, locale, value: t, page: b.page, group: b.group, label: b.label },
        })
      },
    })
  }

  const entityText = (entity: string, id: number, field: string, text: string | null) => {
    if (!text) return
    jobs.push({
      text,
      apply: async (t) => {
        await prisma.translation.upsert({
          where: { entity_entityId_field_locale: { entity, entityId: id, field, locale } },
          update: { value: t, aiGenerated: true },
          create: { entity, entityId: id, field, locale, value: t, aiGenerated: true },
        })
      },
    })
    translationCount++
  }

  // --- Kezelések ---
  const services = await prisma.service.findMany({
    where: { archivedAt: null },
    select: { id: true, title: true, lead: true, desc: true, metaTitle: true, metaDescription: true },
  })
  for (const s of services) {
    entityText('Service', s.id, 'title', s.title)
    entityText('Service', s.id, 'lead', s.lead)
    entityText('Service', s.id, 'desc', s.desc)
    entityText('Service', s.id, 'metaTitle', s.metaTitle)
    entityText('Service', s.id, 'metaDescription', s.metaDescription)
  }

  // --- Kezelés-típusok (a longDesc bekezdésenként) ---
  const categories = await prisma.serviceCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true, shortDesc: true, longDesc: true },
  })
  for (const c of categories) {
    entityText('ServiceCategory', c.id, 'name', c.name)
    entityText('ServiceCategory', c.id, 'shortDesc', c.shortDesc)
    const paras = Array.isArray(c.longDesc) ? (c.longDesc as string[]) : []
    paras.forEach((p, i) => entityText('ServiceCategory', c.id, `longDesc.${i}`, p))
  }

  // --- Bérletek ---
  const passes = await prisma.passTemplate.findMany({
    where: { archivedAt: null },
    select: { id: true, title: true, desc: true },
  })
  for (const p of passes) {
    entityText('PassTemplate', p.id, 'title', p.title)
    entityText('PassTemplate', p.id, 'desc', p.desc)
  }

  // --- Szakemberek (a nevet NEM fordítjuk) ---
  const practitioners = await prisma.practitioner.findMany({
    where: { archivedAt: null },
    select: { id: true, category: true, desc: true },
  })
  for (const pr of practitioners) {
    entityText('Practitioner', pr.id, 'category', pr.category)
    entityText('Practitioner', pr.id, 'desc', pr.desc)
  }

  // --- Fordítás adagokban, majd mentés ---
  const texts = jobs.map((j) => j.text)
  const translated: string[] = []
  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK)
    const out = await translateBatch(chunk, languageName)
    translated.push(...out)
  }
  for (const [i, job] of jobs.entries()) {
    await job.apply(translated[i] ?? job.text)
  }

  return { contentBlocks: blocks.length, translations: translationCount }
}
