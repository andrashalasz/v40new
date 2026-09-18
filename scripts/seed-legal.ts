import { prisma } from '../server/utils/prisma'
import { readFileSync, writeFileSync } from 'node:fs'

/**
 * Kinyeri a jogi oldalak (ÁSZF, Adatvédelmi) jelenlegi HTML-törzsét a .vue
 * fájlból, és HU RICHTEXT ContentBlockként tárolja (key: aszf.body /
 * adatvedelmi.body, page: 'legal'). A törzset a fő wrapper <div> belseje adja
 * (a <Header/> és <Footer/> nélkül). A fordításhoz külön .html fájlba is kiírja.
 */
function innerBody(file: string): string {
  const src = readFileSync(file, 'utf8')
  // az első "max-w-4xl" wrapper div nyitó tagjének vége
  const anchor = src.indexOf('max-w-4xl')
  const open = src.indexOf('>', anchor) + 1
  const footer = src.indexOf('<Footer', open)
  // a wrapper záró </div> a <Footer /> előtt
  const close = src.lastIndexOf('</div>', footer)
  return src.slice(open, close).trim()
}

async function save(key: string, html: string) {
  await prisma.contentBlock.upsert({
    where: { key_locale: { key, locale: 'hu' } },
    create: { key, locale: 'hu', value: html, page: 'legal', group: key, label: key, type: 'RICHTEXT' },
    update: { value: html, page: 'legal', type: 'RICHTEXT' },
  })
}

async function main() {
  const aszf = innerBody('app/pages/aszf.vue')
  const adat = innerBody('app/pages/adatvedelmi.vue')
  await save('aszf.body', aszf)
  await save('adatvedelmi.body', adat)
  writeFileSync('prisma/legal-hu.json', JSON.stringify({ 'aszf.body': aszf, 'adatvedelmi.body': adat }, null, 1))
  console.log(`aszf.body: ${aszf.length} kar, adatvedelmi.body: ${adat.length} kar — HU mentve.`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
