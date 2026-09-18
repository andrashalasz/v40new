import { prisma } from '../server/utils/prisma'
import { readFileSync, readdirSync } from 'node:fs'

/** A catbody.<slug> EN/DE fordításait menti (RICHTEXT, page='legal') a bodydict-*.json-okból. */
async function main() {
  const dict: Record<string, { en?: string; de?: string }> = {}
  for (const f of readdirSync('prisma').filter((n) => /^bodydict-.*\.json$/.test(n))) Object.assign(dict, JSON.parse(readFileSync(`prisma/${f}`, 'utf8')))
  let n = 0
  for (const [key, tr] of Object.entries(dict)) {
    for (const loc of ['en', 'de'] as const) {
      const val = tr[loc]?.trim(); if (!val) continue
      await prisma.contentBlock.upsert({
        where: { key_locale: { key, locale: loc } },
        create: { key, locale: loc, value: val, page: 'legal', group: key, label: key, type: 'RICHTEXT' },
        update: { value: val, page: 'legal', type: 'RICHTEXT' },
      })
      n++
    }
  }
  console.log(`catbody EN/DE beírva: ${n} (${Object.keys(dict).length} törzs).`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
