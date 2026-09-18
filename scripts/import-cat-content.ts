import { prisma } from '../server/utils/prisma'
import { execSync } from 'node:child_process'
import { writeFileSync, existsSync, readFileSync } from 'node:fs'

/**
 * Kategória-tartalom frissítése docx-ekből: shortDesc (rövid) + longDesc
 * (felugró bekezdések). A heroImage-t NEM érinti (marad a kép). A HU frissítése
 * mellett a fordítandó mezőket a prisma/catdelta-hu.json-ba gyűjti.
 */
function paras(docx: string): string[] {
  const xml = execSync(`unzip -p ${JSON.stringify('Anyagok/' + docx)} word/document.xml`, { maxBuffer: 1024 * 1024 * 16 }).toString('utf8')
  const withBreaks = xml.replace(/<\/w:p>/g, '\n')
  const text = withBreaks.replace(/<[^>]+>/g, '')
  return text
    .split('\n')
    .map((s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 1)
}

interface Job { slug: string; short?: string; shortDocx?: string; longDocx: string; dropFirst?: number }
const JOBS: Job[] = [
  {
    slug: 'menopauza-program',
    shortDocx: 'AG.Menopauza.docx',
    longDocx: '8.0 V40_VITAL_Menopauza_Healthspan_honlap_tajekoztato.docx',
    dropFirst: 3,
  },
  {
    slug: 'perimenopauza',
    short: 'A perimenopauza és a menopauzális átmenet nem csupán hormonális változás, hanem fontos prevenciós ablak: ilyenkor a vérzsírok, a testösszetétel, az érfunkció, az alvás és a teljesítőképesség is módosulhat. A V40 Vital női healthspan programja célzott állapotfelméréssel és személyre szabott prevencióval védi a következő évtizedek egészségét.',
    longDocx: '12.0 V40_VITAL_Perimenopauza_Longevity_betegtajekoztato.docx',
    dropFirst: 3,
  },
  {
    slug: 'intim-hifem',
    shortDocx: 'BB. Mi az Intim HIFEM.docx',
    longDocx: '10.0 V40_Vital_Intim_HIFEM_Landing_Page_RenaSculpt.docx',
    dropFirst: 2,
  },
  {
    slug: 'ferfi-intim-hifem',
    shortDocx: 'ABintim HIFEM AB.docx',
    longDocx: '9.0 V40_Vital_Ferfi_Intim_HIFEM_RenaSculpt.docx',
    dropFirst: 2,
  },
  {
    // Az árlistát az InfusionPrices komponens mutatja, ezért a hosszú tartalom az
    // AF próza (a 15.0 táblázatot NEM duplikáljuk).
    slug: 'infuzios-kezelesek',
    short: 'Infúziós terápiák – célzott támogatás, orvosi kontroll mellett. A V40Vital infúziós programjai a szervezet regenerációját, anyagcsere-folyamatait és általános fiziológiai működését támogatják, egyéni állapothoz és célokhoz igazított, orvosilag felügyelt kiegészítő terápiaként.',
    longDocx: 'AF.Infuìzioìs teraìpiaìk.docx',
    dropFirst: 1,
  },
  {
    slug: 'taplalkozas-longevity',
    short: 'Nem egy újabb diéta, hanem személyre szabott táplálkozási stratégia, amely hosszú távon támogatja a szív, az anyagcsere, az izomzat és a bélrendszer egészségét – a healthspan, az egészségben eltöltött évek növeléséért.',
    longDocx: '7.0 V40_VITAL_Taplalkozas_Dietetika_Longevity_honlapanyag.docx',
    dropFirst: 2,
  },
]

async function main() {
  const delta: { entity: string; id: number; slug: string; fields: Record<string, string> }[] = []
  if (existsSync('prisma/catdelta-hu.json')) delta.push(...JSON.parse(readFileSync('prisma/catdelta-hu.json', 'utf8')))

  for (const job of JOBS) {
    const cat = await prisma.serviceCategory.findUnique({ where: { slug: job.slug }, select: { id: true } })
    if (!cat) { console.log(`nincs kategoria: ${job.slug}`); continue }
    const short = job.short ?? paras(job.shortDocx!).join(' ')
    const long = paras(job.longDocx).slice(job.dropFirst ?? 0)
    await prisma.serviceCategory.update({ where: { id: cat.id }, data: { shortDesc: short, longDesc: long as never } })
    const fields: Record<string, string> = { shortDesc: short }
    long.forEach((p, i) => { fields[`longDesc.${i}`] = p })
    const idx = delta.findIndex((d) => d.slug === job.slug)
    const entry = { entity: 'ServiceCategory', id: cat.id, slug: job.slug, fields }
    if (idx >= 0) delta[idx] = entry; else delta.push(entry)
    console.log(`${job.slug}: shortDesc + ${long.length} bekezdes (HU). id=${cat.id}`)
  }
  writeFileSync('prisma/catdelta-hu.json', JSON.stringify(delta, null, 1))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
