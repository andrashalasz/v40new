import { prisma } from '../server/utils/prisma'
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Végigmegy az app/ .vue fájljain, kigyűjti a t('kulcs', 'magyar fallback')
 * hívásokat, és a HIÁNYZÓ magyar ContentBlockokat felveszi a fallbackból.
 * Majd kigyűjti azokat a kulcsokat, amelyeknek nincs EN vagy DE fordítása,
 * hogy le lehessen fordítani. Nem írja felül a meglévő HU értékeket.
 *
 * Kimenet: prisma/ui-untranslated.json — az egyedi magyar szövegek listája,
 * amikhez EN/DE kell.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (name.endsWith('.vue') || name.endsWith('.ts')) out.push(p)
  }
  return out
}

// t('key', 'fallback') vagy t("key", "fallback") — a fallback tartalmazhat aposztrófot, ha " a határoló
const RE = /\bt\(\s*(['"])([a-zA-Z0-9_.]+)\1\s*,\s*(['"])((?:\\.|(?!\3)[\s\S])*?)\3\s*\)/g

function unescape(s: string, q: string) {
  return s.replace(new RegExp(`\\\\${q}`, 'g'), q).replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
}

async function main() {
  const files = walk('app')
  const found = new Map<string, string>() // key -> HU fallback
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    let m: RegExpExecArray | null
    while ((m = RE.exec(src))) {
      const key = m[2]!
      const fb = unescape(m[4]!, m[3]!)
      if (!found.has(key) && fb.trim()) found.set(key, fb)
    }
  }
  console.log(`talált t() kulcs: ${found.size}`)

  // meglévő HU
  const huRows = await prisma.contentBlock.findMany({ where: { locale: 'hu' }, select: { key: true, value: true } })
  const huMap = new Map(huRows.map((r) => [r.key, r.value]))

  let created = 0
  for (const [key, fb] of found) {
    if (huMap.has(key)) continue
    const page = key.split('.')[0] || 'global'
    const group = key.split('.').slice(0, 2).join('.')
    await prisma.contentBlock.create({ data: { key, locale: 'hu', value: fb, page, group, label: key, type: 'TEXT' } })
    huMap.set(key, fb)
    created++
  }
  console.log(`új HU ContentBlock: ${created}`)

  // melyik kulcsnak hiányzik EN vagy DE
  const en = new Set((await prisma.contentBlock.findMany({ where: { locale: 'en' }, select: { key: true } })).map((r) => r.key))
  const de = new Set((await prisma.contentBlock.findMany({ where: { locale: 'de' }, select: { key: true } })).map((r) => r.key))
  const need = new Set<string>()
  for (const key of found.keys()) {
    const hu = huMap.get(key)
    if (!hu) continue
    if (!en.has(key) || !de.has(key)) need.add(hu.trim())
  }
  const arr = [...need]
  writeFileSync('prisma/ui-untranslated.json', JSON.stringify(arr, null, 1))
  console.log(`EN/DE fordítandó egyedi szöveg: ${arr.length}`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
