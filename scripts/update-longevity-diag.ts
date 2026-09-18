import { prisma } from '../server/utils/prisma'
import { writeFileSync } from 'node:fs'

/**
 * A „Longevity diagnosztika" kategória tartalmának frissítése:
 *  - shortDesc (kártya + felugró intro): 2. V40A2.docx lényege
 *  - longDesc (felugró bekezdések): 5. V40_Vital_Longevity_Scan_szerkesztheto.docx
 *    (a Basic/Komplex/Prémium táblázatot a PackageComparison komponens mutatja,
 *     ezért itt NINCS benne).
 * A HU frissítése mellett kiírja a fordítandó szövegeket (ldiag-hu.json).
 */
const SHORT = 'A V40 Vital nem általános tanácsokkal, hanem longevity diagnosztikával kezd: a páciens állapotát objektíven, strukturáltan és orvosilag értelmezhető módon méri fel. Célja a korai rizikótényezők felismerése és annak megmutatása, mely területeken szükséges mielőbbi beavatkozás.'

const LONG: string[] = [
  'Prémium diagnosztikai program',
  'A longevity az orvostudományban nem csupán az élettartam meghosszabbítását jelenti, hanem az egészségben eltöltött évek számának növelését, az életminőség megőrzését, a biológiai öregedés lassítását, valamint a krónikus betegségek korai felismerését és megelőzését.',
  'A program fókusza a biológiai öregedés, a fiziológiai rendszerek működése és az általános jóllét komplex felmérése, amely alapot ad a célzott, egyénre szabott orvosi útvonal kialakításához.',
  'Korai rizikófelismerés négy kulcsterületen: szív- és érrendszer, daganatos betegségek, légzőszervi betegségek és metabolikus diszfunkciók.',
  'Miért fontos a korai diagnosztika?',
  'A legtöbb krónikus betegség évekkel, akár évtizedekkel korábban elkezdődik, mint amikor tünetet okoz. Ezért érdemes időben felmérni a legkorábbi rizikótényezőket, és személyre szabott prevenciós tervet kialakítani.',
  'Szív- és érrendszer',
  'Érelmeszesedés, ritmuszavarok, korai érrendszeri eltérések és rejtett kardiovaszkuláris kockázatok felmérése.',
  'Daganatos rizikó',
  'Laboratóriumi és célzott szűrési elemek a személyes rizikóprofilhoz igazítva.',
  'Légzőrendszer',
  'Spirometriás és funkcionális vizsgálatok a respiratorikus eltérések korai felismerésére.',
  'Metabolikus egészség',
  'Inzulinrezisztencia, cukoranyagcsere, zsigeri zsírtömeg és hormonális egyensúly értékelése.',
  'Kiknek szól a program?',
  '• 40 év felettieknek, akik szeretnék jelenlegi életmódjukat hosszú éveken át megőrizni.',
  '• 55 év felettieknek, akik fizikai és mentális teljesítményüket szeretnék újra optimális szintre hozni.',
  '• Azoknak, akik könnyebben elfáradnak, lassabban regenerálódnak, vagy koncentrációs és memóriazavarokat tapasztalnak.',
  '• Azoknak, akik magas stresszterheléssel élnek, miközben háttérbe szorul a pihenés, a mozgás és az egészségmegőrzés.',
  '• Azoknak a nőknek, akik a menopauza időszakában célzott, személyre szabott támogatást keresnek.',
  'Vizsgálati csomagok',
  'A vizsgálati csomagok egymásra épülnek: a Basic program a fő rizikófaktorok gyors áttekintését, a Komplex csomag a részletesebb feltérképezést, a Prémium csomag pedig a legátfogóbb longevity szemléletű kivizsgálást kínálja.',
]

async function main() {
  const cat = await prisma.serviceCategory.findUnique({ where: { slug: 'longevity-diagnosztika' }, select: { id: true } })
  if (!cat) throw new Error('Nincs longevity-diagnosztika kategória.')
  await prisma.serviceCategory.update({ where: { id: cat.id }, data: { shortDesc: SHORT, longDesc: LONG as never } })

  // fordítandó szövegek: field -> HU
  const fields: Record<string, string> = { shortDesc: SHORT }
  LONG.forEach((p, i) => { fields[`longDesc.${i}`] = p })
  writeFileSync('prisma/ldiag-hu.json', JSON.stringify({ id: cat.id, fields }, null, 1))
  console.log(`Longevity diagnosztika HU frissítve: shortDesc + ${LONG.length} bekezdés. id=${cat.id}`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
