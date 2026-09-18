import { prisma } from '../server/utils/prisma'
import { readFileSync } from 'node:fs'

/** A longevity.intro / longevity.after EN/DE fordítását menti (RICHTEXT, page='legal'). */
async function main() {
  const dict = JSON.parse(readFileSync('prisma/longevity2-dict.json', 'utf8')) as Record<string, { en?: string; de?: string }>
  for (const [key, tr] of Object.entries(dict)) {
    for (const loc of ['en', 'de'] as const) {
      const val = tr[loc]?.trim(); if (!val) continue
      await prisma.contentBlock.upsert({
        where: { key_locale: { key, locale: loc } },
        create: { key, locale: loc, value: val, page: 'legal', group: key, label: key, type: 'RICHTEXT' },
        update: { value: val, page: 'legal', type: 'RICHTEXT' },
      })
    }
    console.log(`${key}: en=${tr.en?.length ?? 0} de=${tr.de?.length ?? 0} mentve`)
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
