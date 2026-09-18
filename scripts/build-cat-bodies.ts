import { prisma } from '../server/utils/prisma'
import { writeFileSync } from 'node:fs'
import mammoth from 'mammoth'

/**
 * Kategória felugró-tartalom Word-szerű, formázott HTML-ként (mammoth docx→HTML
 * + Tailwind-stílus), catbody.<slug> RICHTEXT ContentBlockként (page='legal').
 * A heroImage-t és a shortDesc-et NEM érinti. Kiírja a fordítandó HU HTML-eket.
 */
interface Job { slug: string; docx: string; drop: number }
const JOBS: Job[] = [
  { slug: 'longevity-diagnosztika', docx: '5. V40_Vital_Longevity_Scan_szerkesztheto.docx', drop: 1 },
  { slug: 'anyajegy-vizsgalat', docx: '13.0 V40_VITAL_FotoFinder_melanoma_korai_felismeres_honlapanyag_v1.docx', drop: 1 },
  { slug: 'genetikai-program', docx: '11. V40_VITAL_Genetikai_Precizios_Prevencios_Program_v1.docx', drop: 4 },
  { slug: 'terapias-programok', docx: '3.0 V40A3.docx', drop: 1 },
  { slug: 'orvosi-testsulycsokkentes', docx: '6.0 V40A CARDIOMERLEG_V40Vital_honlapra_v1.docx', drop: 4 },
  { slug: 'mikrobiome-programok', docx: '14.0 V40Vital_Mikrobiom_Healthspan_Program.docx', drop: 1 },
  { slug: 'menopauza-program', docx: '8.0 V40_VITAL_Menopauza_Healthspan_honlap_tajekoztato.docx', drop: 3 },
  { slug: 'perimenopauza', docx: '12.0 V40_VITAL_Perimenopauza_Longevity_betegtajekoztato.docx', drop: 3 },
  { slug: 'intim-hifem', docx: '10.0 V40_Vital_Intim_HIFEM_Landing_Page_RenaSculpt.docx', drop: 2 },
  { slug: 'ferfi-intim-hifem', docx: '9.0 V40_Vital_Ferfi_Intim_HIFEM_RenaSculpt.docx', drop: 2 },
  { slug: 'infuzios-kezelesek', docx: '15.0V40Vital_infuzios_tajekoztato_es_arlista_szerkesztheto.docx', drop: 4 },
  { slug: 'taplalkozas-longevity', docx: '7.0 V40_VITAL_Taplalkozas_Dietetika_Longevity_honlapanyag.docx', drop: 2 },
]

const BLOCK_RE = /<(p|ul|ol|table|h[1-6])\b[^>]*>[\s\S]*?<\/\1>/g

function isHeadingP(block: string): string | null {
  // teljesen félkövér, rövid bekezdés -> címsor
  const m = block.match(/^<p>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>$/)
  if (m && m[1]) {
    const t = m[1].replace(/<[^>]+>/g, '').trim()
    if (t.length > 0 && t.length <= 70) return t
  }
  return null
}

// Tiszta, szemantikus HTML (a stílus a .cat-body globális CSS-ből jön). Az
// egyoszlopos (elrendezés) táblázatokat blokká bontjuk, csak a valódi több-
// oszlopos adat-táblázat marad táblázat.
function processBlock(b: string, out: string[]): void {
  const heading = isHeadingP(b)
  if (heading) { out.push(`<h3>${heading}</h3>`); return }
  if (b.startsWith('<table')) {
    const rows = b.match(/<tr>[\s\S]*?<\/tr>/g) ?? []
    const maxCols = Math.max(0, ...rows.map((r) => (r.match(/<t[dh]\b/g) ?? []).length))
    // Valódi adat-táblázat: legalább 3 sor és legalább 2 oszlop. Minden más
    // (egyoszlopos vagy néhány soros elrendezés-táblázat, üres sáv) blokká bomlik.
    if (rows.length >= 3 && maxCols >= 2) {
      out.push(`<div class="cat-table">${b.replace(/^<table[^>]*>/, '<table>')}</div>`)
    } else {
      for (const r of rows) {
        const cells = r.match(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g) ?? []
        for (const c of cells) {
          const cell = c.replace(/^<t[dh]\b[^>]*>/, '').replace(/<\/t[dh]>$/, '')
          const inner = cell.match(BLOCK_RE) ?? (cell.replace(/<[^>]+>/g, '').trim() ? [`<p>${cell.trim()}</p>`] : [])
          for (const ib of inner) processBlock(ib, out)
        }
      }
    }
    return
  }
  if (/^<h[1-6]/.test(b)) { out.push(`<h3>${b.replace(/<[^>]+>/g, '').trim()}</h3>`); return }
  out.push(b) // <p>, <ul>, <ol>
}

function style(html: string, drop: number): string {
  const blocks = (html.match(BLOCK_RE) ?? []).slice(drop)
  const out: string[] = []
  for (const b of blocks) processBlock(b, out)
  return out.join('\n')
}

async function main() {
  const forTranslate: Record<string, string> = {}
  for (const job of JOBS) {
    const cat = await prisma.serviceCategory.findUnique({ where: { slug: job.slug }, select: { id: true } })
    if (!cat) { console.log('nincs kategoria:', job.slug); continue }
    const { value: rawHtml } = await mammoth.convertToHtml({ path: `Anyagok/${job.docx}` })
    const html = style(rawHtml, job.drop)
    const key = `catbody.${job.slug}`
    await prisma.contentBlock.upsert({
      where: { key_locale: { key, locale: 'hu' } },
      create: { key, locale: 'hu', value: html, page: 'legal', group: key, label: key, type: 'RICHTEXT' },
      update: { value: html, page: 'legal', type: 'RICHTEXT' },
    })
    forTranslate[key] = html
    console.log(`${job.slug}: catbody HU (${html.length} kar).`)
  }
  writeFileSync('prisma/catbody-hu.json', JSON.stringify(forTranslate, null, 1))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
