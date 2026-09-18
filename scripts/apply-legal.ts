import { prisma } from '../server/utils/prisma'
import { readFileSync, existsSync } from 'node:fs'

/**
 * A jogi oldalak EN/DE fordítását (prisma/legal-aszf.json, legal-adatvedelmi.json)
 * ContentBlockként menti (RICHTEXT, page: 'legal'). Idempotens.
 */
async function save(key: string, locale: string, html: string) {
  await prisma.contentBlock.upsert({
    where: { key_locale: { key, locale } },
    create: { key, locale, value: html, page: 'legal', group: key, label: key, type: 'RICHTEXT' },
    update: { value: html, page: 'legal', type: 'RICHTEXT' },
  })
}

async function main() {
  const docs: [string, string][] = [
    ['aszf.body', 'prisma/legal-aszf.json'],
    ['adatvedelmi.body', 'prisma/legal-adatvedelmi.json'],
    ['longevity.body', 'prisma/longevity-dict.json'],
  ]
  for (const [key, file] of docs) {
    if (!existsSync(file)) continue
    const d = JSON.parse(readFileSync(file, 'utf8')) as { en?: string; de?: string }
    if (d.en?.trim()) await save(key, 'en', d.en)
    if (d.de?.trim()) await save(key, 'de', d.de)
    console.log(`${key}: en=${d.en?.length ?? 0} de=${d.de?.length ?? 0} mentve`)
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
