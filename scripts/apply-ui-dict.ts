import { prisma } from '../server/utils/prisma'
import { readFileSync } from 'node:fs'

/**
 * A prisma/ui-dict.json (HU→{en,de}) alapján felveszi a hiányzó EN/DE
 * ContentBlockokat azokhoz a kulcsokhoz, amelyek HU értéke megegyezik. A
 * meglévő EN/DE értékeket NEM írja felül. Idempotens.
 */
async function main() {
  const dict = JSON.parse(readFileSync('prisma/ui-dict.json', 'utf8')) as Record<string, { en?: string; de?: string }>
  const norm: Record<string, { en?: string; de?: string }> = {}
  for (const [k, v] of Object.entries(dict)) norm[k.trim()] = v

  const hu = await prisma.contentBlock.findMany({ where: { locale: 'hu' }, select: { key: true, value: true, page: true, group: true, label: true, type: true } })
  const en = new Set((await prisma.contentBlock.findMany({ where: { locale: 'en' }, select: { key: true } })).map((r) => r.key))
  const de = new Set((await prisma.contentBlock.findMany({ where: { locale: 'de' }, select: { key: true } })).map((r) => r.key))

  let n = 0, miss = 0
  for (const b of hu) {
    const tr = norm[b.value.trim()]
    if (!tr) continue
    for (const [loc, has] of [['en', en], ['de', de]] as const) {
      if (has.has(b.key)) continue
      const val = (tr as Record<string, string>)[loc]?.trim()
      if (!val) { miss++; continue }
      await prisma.contentBlock.create({ data: { key: b.key, locale: loc, value: val, page: b.page, group: b.group, label: b.label, type: b.type } })
      n++
    }
  }
  console.log(`beírt EN/DE ContentBlock: ${n}; szótárból hiányzott: ${miss}`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
