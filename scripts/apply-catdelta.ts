import { prisma } from '../server/utils/prisma'
import { readFileSync, readdirSync } from 'node:fs'

/**
 * A frissített kategóriák (catdelta-hu.json) EN/DE fordításainak visszaírása a
 * Translation táblába a HU→{en,de} szótár (catdict-*.json) alapján.
 * Előbb törli az érintett kategóriák régi shortDesc + longDesc.* fordításait
 * (EN/DE), hogy ne maradjon orphan bekezdés, majd frissen létrehozza.
 */
function loadDict(): Record<string, { en?: string; de?: string }> {
  const dict: Record<string, { en?: string; de?: string }> = {}
  for (const f of readdirSync('prisma').filter((n) => /^catdict-.*\.json$/.test(n))) Object.assign(dict, JSON.parse(readFileSync(`prisma/${f}`, 'utf8')))
  const norm: Record<string, { en?: string; de?: string }> = {}
  for (const [k, v] of Object.entries(dict)) norm[k.trim()] = v
  return norm
}

async function main() {
  const dict = loadDict()
  const get = (hu: string, loc: string) => (dict[hu.trim()] as Record<string, string> | undefined)?.[loc]?.trim() || ''
  const delta = JSON.parse(readFileSync('prisma/catdelta-hu.json', 'utf8')) as { id: number; slug: string; fields: Record<string, string> }[]

  let created = 0, miss = 0
  for (const cat of delta) {
    // régi fordítások törlése (shortDesc + longDesc.*)
    await prisma.translation.deleteMany({
      where: { entity: 'ServiceCategory', entityId: cat.id, locale: { in: ['en', 'de'] }, OR: [{ field: 'shortDesc' }, { field: { startsWith: 'longDesc.' } }] },
    })
    for (const [field, hu] of Object.entries(cat.fields)) {
      for (const loc of ['en', 'de'] as const) {
        const val = get(hu, loc)
        if (!val) { miss++; continue }
        await prisma.translation.create({ data: { entity: 'ServiceCategory', entityId: cat.id, field, locale: loc, value: val, aiGenerated: true } })
        created++
      }
    }
    console.log(`${cat.slug}: ${Object.keys(cat.fields).length} mező × 2 nyelv frissítve.`)
  }
  console.log(`Összesen beírt fordítás: ${created}; szótárból hiányzott: ${miss}`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
