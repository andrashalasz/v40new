import { prisma } from '../server/utils/prisma'

/**
 * A /longevity oldal törzse KÉT RICHTEXT ContentBlockban (page='legal'):
 *   - longevity.intro : a bevezető (1. V40 ALAP1A .docx)
 *   - longevity.after : Infúzió/Regenera + Életmód & Healthspan + Terápiás Programok (3.0)
 * A kettő közé az oldalon egy INTERAKTÍV „Longevity szolgáltatásaink" szekció kerül
 * (kattintható, felugró ablakkal) – ezért a szolgáltatás-lista NEM itt van.
 */
const INTRO = `
<section>
  <h2 class="text-[26px] lg:text-[36px] dm-sans font-bold text-[#171008] mb-6">A V40 Vital longevity szemléletének lényege</h2>
  <div class="space-y-4 text-[#171008]/90 text-[17px] leading-[1.7]">
    <p>Orvosi értelemben a longevity nem egyszerűen a várható élettartam meghosszabbítását jelenti, hanem azt a komplex, prevenciós szemléletet, amelynek célja a krónikus betegségek korai felismerése és megelőzése, a biológiai öregedés kedvező befolyásolása, valamint a fizikai és szellemi funkciók minél hosszabb ideig történő megőrzése.</p>
    <p>A <strong>healthspan</strong> az életnek azt az időszakát jelenti, amelyet az ember jó egészségi állapotban, megfelelő funkcionális képességgel és önállósággal tölt el, jelentős krónikus betegségek vagy tartós életminőség-romlás nélkül.</p>
    <p>A modern longevity medicina elsődleges célja tehát nem pusztán az, hogy tovább éljünk, hanem hogy tovább maradjunk egészségesek, aktívak és funkcionálisan önállók.</p>
    <p>A V40 Vital számára a longevity nem önmagában a hosszú életet jelenti. A cél nem pusztán a minél hosszabb túlélés, hanem a <strong>hosszú élet megfelelő életminőségben</strong>. Ez azt jelenti, hogy az ember minél több évet éljen meg jó fizikai, mentális és funkcionális állapotban, minél később alakuljanak ki a krónikus betegségek, és minél tovább maradjon önálló, terhelhető, aktív.</p>
    <p>A V40 Vital longevity-felfogása ezért a healthspanre, vagyis az egészségben eltöltött évekre helyezi a hangsúlyt. Ez az a pont, ahol a V40 Vital világosan megkülönbözteti magát a többi szolgáltatótól. A valódi cél nem a puszta élethossz romantikus ígérete, hanem annak biztosítása, hogy a későbbi életévek ne:</p>
    <ul class="list-disc pl-6 space-y-1">
      <li>szív- és érrendszeri betegségekkel,</li>
      <li>cukoranyagcsere-zavarokkal,</li>
      <li>elhízással,</li>
      <li>csökkenő fizikai állapottal,</li>
      <li>izomgyengeséggel,</li>
      <li>rossz alvással,</li>
      <li>krónikus gyulladásos állapottal,</li>
      <li>vagy az életminőség romlásával teljenek.</li>
    </ul>
  </div>
</section>
`.trim()

const AFTER = `
<section class="mb-12">
  <h3 class="text-[22px] lg:text-[28px] dm-sans font-bold text-[#171008] mb-4">V40Vital Longevity Infusion</h3>
  <p class="text-[#171008]/90 text-[17px] leading-[1.7] mb-4">Infúziós támogatás a healthspan szolgálatában.</p>
  <div class="bg-[#F4F4F0] rounded-xl p-6">
    <p class="dm-sans font-semibold text-[#171008] mb-2">V40Vital Regenera</p>
    <p class="text-[#171008]/90 text-[16px] leading-[1.7]">Regenera NAD+, Regenera Restore, Regenera Antioxidant, Regenera Performance, Regenera Balance.</p>
  </div>
</section>

<section class="mb-12">
  <h3 class="text-[22px] lg:text-[28px] dm-sans font-bold text-[#171008] mb-5">Terápiás Programok</h3>
  <div class="space-y-4 text-[#171008]/90 text-[17px] leading-[1.7]">
    <p>A V40 Vital nem áll meg a felismerésnél. Ahol szükséges, ott <strong>orvosi kezelést is ad</strong>.</p>
    <p>Ez különösen fontos, mert a longevity csak akkor hiteles, ha nemcsak azt mondja meg, mi a probléma, hanem azt is, hogy mit kell vele kezdeni. Ha a diagnosztika során felismerhető:</p>
    <ul class="list-disc pl-6 space-y-1">
      <li>magas vérnyomás,</li>
      <li>emelkedett szív-, vese- és anyagcsere-kockázat,</li>
      <li>inzulinrezisztencia vagy cukorbetegség,</li>
      <li>túlsúly vagy elhízás,</li>
      <li>gyulladásos kockázatok,</li>
      <li>kedvezőtlen, mikrobiommal összefüggő eltérések,</li>
      <li>csökkent fizikai vagy izomfunkció,</li>
      <li>infúziós vitalizáló kezelések igénye,</li>
    </ul>
    <p>akkor a V40 Vital orvosi kezelést, gondozást vagy célzott terápiás javaslatot ad.</p>
    <p class="font-semibold text-[#171008]">A V40 Vital longevity programja ezért nemcsak szűrés, hanem terápiás rendszer is.</p>
  </div>
</section>

<section>
  <h3 class="text-[22px] lg:text-[28px] dm-sans font-bold text-[#171008] mb-2">Életmód &amp; Healthspan</h3>
  <p class="dm-sans font-semibold text-[#153131] text-[18px] mb-4">Táplálkozás. Mozgás. Erő. Egyensúly.</p>
  <p class="text-[#171008]/90 text-[17px] leading-[1.7] mb-6">A hosszabb egészséges élet egyik legfontosabb eszköze az életmód. Dietetikusaink és mozgásszakembereink személyre szabott programokkal segítik az optimális testösszetétel, az izomerő, a metabolikus egészség és a fizikai teljesítőképesség hosszú távú megőrzését.</p>
  <div class="grid sm:grid-cols-2 gap-4">
    <div class="bg-white border border-[#ECEDEF] rounded-xl p-6">
      <p class="dm-sans font-bold text-[#171008] text-[18px] mb-1.5">Táplálkozás</p>
      <p class="text-[#171008]/80 text-[15px] leading-[1.6]">Személyre szabott dietetikai és metabolikus támogatás.</p>
    </div>
    <div class="bg-white border border-[#ECEDEF] rounded-xl p-6">
      <p class="dm-sans font-bold text-[#171008] text-[18px] mb-1.5">Mozgás &amp; Izomerő</p>
      <p class="text-[#171008]/80 text-[15px] leading-[1.6]">Személyre szabott mozgásprogram a funkcionális egészség megőrzésére.</p>
    </div>
  </div>
</section>
`.trim()

async function save(key: string, html: string) {
  await prisma.contentBlock.upsert({
    where: { key_locale: { key, locale: 'hu' } },
    create: { key, locale: 'hu', value: html, page: 'legal', group: key, label: key, type: 'RICHTEXT' },
    update: { value: html, page: 'legal', type: 'RICHTEXT' },
  })
}

async function main() {
  await save('longevity.intro', INTRO)
  await save('longevity.after', AFTER)
  // A régi egyesített blokk törlése (már két részre bomlik).
  await prisma.contentBlock.deleteMany({ where: { key: 'longevity.body' } })
  console.log(`longevity.intro (${INTRO.length}) + longevity.after (${AFTER.length}) HU mentve; longevity.body törölve.`)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
