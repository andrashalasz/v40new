import { prisma } from '../server/utils/prisma'

/**
 * Az infúziós árlista és a Longevity csomag-táblázat EN/DE lokalizált változatát
 * építi a magyar blokkból (a struktúra és az árak változatlanok, csak a
 * megjelenő címkék fordulnak). A fordítások alább, szótárban. Idempotens.
 */

// HU címke -> {en, de}
const D: Record<string, { en: string; de: string }> = {
  // --- infúzió: name ---
  'NAD+ infúzió': { en: 'NAD+ infusion', de: 'NAD+-Infusion' },
  'V40 Vital Signature infúzió': { en: 'V40 Vital Signature infusion', de: 'V40 Vital Signature Infusion' },
  'Premium Vitality': { en: 'Premium Vitality', de: 'Premium Vitality' },
  'V40 Burnout Balance START': { en: 'V40 Burnout Balance START', de: 'V40 Burnout Balance START' },
  'V40 Burnout Prime': { en: 'V40 Burnout Prime', de: 'V40 Burnout Prime' },
  'Vital Amino infúzió': { en: 'Vital Amino infusion', de: 'Vital Amino Infusion' },
  'InfuVital HormonBalance': { en: 'InfuVital HormonBalance', de: 'InfuVital HormonBalance' },
  'InfuVital Radiance': { en: 'InfuVital Radiance', de: 'InfuVital Radiance' },
  'V40 Vital FEMINA LONGEVITY': { en: 'V40 Vital FEMINA LONGEVITY', de: 'V40 Vital FEMINA LONGEVITY' },
  'PowerFuel': { en: 'PowerFuel', de: 'PowerFuel' },
  'Recovery+': { en: 'Recovery+', de: 'Recovery+' },
  'CardioFit Sport': { en: 'CardioFit Sport', de: 'CardioFit Sport' },
  'Glutation infúzió': { en: 'Glutathione infusion', de: 'Glutathion-Infusion' },
  'Q10 koenzim infúzió': { en: 'Coenzyme Q10 infusion', de: 'Coenzym-Q10-Infusion' },
  'V40 ImmunProtect': { en: 'V40 ImmunProtect', de: 'V40 ImmunProtect' },
  'V40 Liver Detox': { en: 'V40 Liver Detox', de: 'V40 Liver Detox' },
  // --- infúzió: subtitle ---
  'sejtszintű energia': { en: 'cellular energy', de: 'Energie auf Zellebene' },
  'prémium vitalizáló formula': { en: 'premium revitalising formula', de: 'Premium-Vitalisierungsformel' },
  'teljes vitalizáló csomag': { en: 'complete revitalisation package', de: 'komplettes Vitalisierungspaket' },
  'stressz és fáradtság': { en: 'stress and fatigue', de: 'Stress und Müdigkeit' },
  'emelt szintű támogatás': { en: 'enhanced support', de: 'erweiterte Unterstützung' },
  'aminosav- és regenerációs támogatás': { en: 'amino acid and recovery support', de: 'Aminosäuren- und Regenerationsunterstützung' },
  'hormonális egyensúly és stresszkezelés': { en: 'hormonal balance and stress management', de: 'hormonelles Gleichgewicht und Stressbewältigung' },
  'bőrfény és hidratálás': { en: 'skin radiance and hydration', de: 'Hautglanz und Feuchtigkeit' },
  'menopauza utáni sejtszintű támogatás': { en: 'post-menopausal cellular support', de: 'zelluläre Unterstützung nach der Menopause' },
  'teljesítményfokozó sportinfúzió': { en: 'performance-boosting sports infusion', de: 'leistungssteigernde Sportinfusion' },
  'gyors regeneráció': { en: 'rapid recovery', de: 'schnelle Regeneration' },
  'szív és állóképesség támogatás': { en: 'heart and endurance support', de: 'Herz- und Ausdauerunterstützung' },
  'antioxidáns támogatás': { en: 'antioxidant support', de: 'antioxidative Unterstützung' },
  'sejtszintű energiatermelés': { en: 'cellular energy production', de: 'Energieproduktion auf Zellebene' },
  'pajzs a fertőzéses időszakokban': { en: 'a shield during infection season', de: 'Schutzschild in Infektionszeiten' },
  'májműködést támogató infúzió': { en: 'liver-supporting infusion', de: 'die Leberfunktion unterstützende Infusion' },
  // --- longevity: packages ---
  'Basic': { en: 'Basic', de: 'Basic' },
  'Komplex': { en: 'Comprehensive', de: 'Komplex' },
  'Prémium': { en: 'Premium', de: 'Premium' },
  // --- longevity: rows ---
  'Kardiológiai és belgyógyászati szakorvosi állapotfelmérés': { en: 'Cardiology and internal medicine specialist assessment', de: 'Fachärztliche Untersuchung in Kardiologie und Innerer Medizin' },
  'Fizikális vizsgálat': { en: 'Physical examination', de: 'Körperliche Untersuchung' },
  'Speciális BTL EKG': { en: 'Special BTL ECG', de: 'Spezielles BTL-EKG' },
  'Kardiovaszkuláris kockázatvizsgálat': { en: 'Cardiovascular risk assessment', de: 'Kardiovaskuläre Risikobewertung' },
  'HRV-vizsgálat': { en: 'HRV (heart rate variability) test', de: 'HRV-Messung (Herzratenvariabilität)' },
  'Lp(a), teljes lipidprofil, triglicerid': { en: 'Lp(a), full lipid profile, triglycerides', de: 'Lp(a), komplettes Lipidprofil, Triglyceride' },
  'Homocisztein, ApoB': { en: 'Homocysteine, ApoB', de: 'Homocystein, ApoB' },
  'Érfalállapot-vizsgálat Dopplerrel': { en: 'Arterial wall assessment with Doppler', de: 'Untersuchung der Gefäßwand mittels Doppler' },
  'Nyaki főütőér duplex ultrahangvizsgálat': { en: 'Carotid artery duplex ultrasound', de: 'Duplex-Ultraschall der Halsschlagader' },
  'Spirometriás légzésfunkciós vizsgálat': { en: 'Spirometry lung function test', de: 'Spirometrische Lungenfunktionsprüfung' },
  'Komplex nagyrutin labor (23 panel)': { en: 'Comprehensive routine lab panel (23 markers)', de: 'Umfassendes Routine-Laborpaket (23 Panels)' },
  'Komplex kiemelt labor (44 panel)': { en: 'Comprehensive premium lab panel (44 markers)', de: 'Umfassendes Premium-Laborpaket (44 Panels)' },
  'Hormonvizsgálatok': { en: 'Hormone tests', de: 'Hormonuntersuchungen' },
  'Inzulinrezisztencia-, cukorbetegség- és HOMA-vizsgálat': { en: 'Insulin resistance, diabetes and HOMA testing', de: 'Insulinresistenz-, Diabetes- und HOMA-Test' },
  'Zsigeri zsírtömeg és izomállapot felmérése': { en: 'Visceral fat mass and muscle status assessment', de: 'Bewertung von viszeralem Fett und Muskelstatus' },
  'Korai vesebetegség vizsgálata': { en: 'Early kidney disease screening', de: 'Früherkennung von Nierenerkrankungen' },
  'Korai szívelégtelenség laboratóriumi vizsgálata': { en: 'Laboratory screening for early heart failure', de: 'Labordiagnostik zur Früherkennung von Herzinsuffizienz' },
  'Szív-echokardiográfia': { en: 'Cardiac echocardiography', de: 'Echokardiographie des Herzens' },
  'Daganatmarkerek vizsgálata': { en: 'Tumour marker testing', de: 'Untersuchung von Tumormarkern' },
  'Vastagbéldaganat genetikai tumormarker-vizsgálata': { en: 'Genetic tumour marker test for colorectal cancer', de: 'Genetischer Tumormarker-Test auf Darmkrebs' },
  'Epigenetikai óra (BioAge) vizsgálata': { en: 'Epigenetic clock (BioAge) test', de: 'Epigenetische Uhr (BioAge)' },
  'Fizikai funkció, izomerő és sarcopenia vizsgálata': { en: 'Physical function, muscle strength and sarcopenia assessment', de: 'Bewertung von körperlicher Funktion, Muskelkraft und Sarkopenie' },
  'Online konzultációs lehetőség': { en: 'Online consultation option', de: 'Möglichkeit zur Online-Beratung' },
  'Bél-agy-szív tengely és mikrobiom vizsgálata': { en: 'Gut–brain–heart axis and microbiome assessment', de: 'Untersuchung der Darm-Hirn-Herz-Achse und des Mikrobioms' },
  'Hasi és kismedencei komplex ultrahangvizsgálat': { en: 'Comprehensive abdominal and pelvic ultrasound', de: 'Umfassender Ultraschall von Bauch und Becken' },
  'Nutrigenetikai állapotfelmérés': { en: 'Nutrigenetic assessment', de: 'Nutrigenetische Statuserhebung' },
  'Személyre szabott szakmai útmutatás és vélemény': { en: 'Personalised professional guidance and opinion', de: 'Individuelle fachliche Beratung und Einschätzung' },
}

async function saveBlock(key: string, locale: string, value: string) {
  const meta = await prisma.contentBlock.findFirst({ where: { key, locale: 'hu' }, select: { page: true, group: true, label: true, type: true } })
  if (!meta) throw new Error(`Nincs HU blokk: ${key}`)
  await prisma.contentBlock.upsert({
    where: { key_locale: { key, locale } },
    create: { key, locale, value, page: meta.page, group: meta.group, label: meta.label, type: meta.type },
    update: { value },
  })
}

async function main() {
  const miss = new Set<string>()
  const tr = (s: string, loc: 'en' | 'de') => { const v = D[s.trim()]; if (!v) { miss.add(s); return s } return v[loc] }

  const inf = JSON.parse((await prisma.contentBlock.findFirst({ where: { key: 'infuzio.pricelist', locale: 'hu' } }))!.value) as { name: string; subtitle: string; price: number }[]
  const lon = JSON.parse((await prisma.contentBlock.findFirst({ where: { key: 'longevity.packages', locale: 'hu' } }))!.value) as { packages: string[]; rows: { item: string; has: boolean[] }[] }

  for (const loc of ['en', 'de'] as const) {
    await saveBlock('infuzio.pricelist', loc, JSON.stringify(inf.map((x) => ({ name: tr(x.name, loc), subtitle: tr(x.subtitle, loc), price: x.price }))))
    await saveBlock('longevity.packages', loc, JSON.stringify({ packages: lon.packages.map((p) => tr(p, loc)), rows: lon.rows.map((r) => ({ item: tr(r.item, loc), has: r.has })) }))
  }
  console.log(`Kész. Lefordítatlan címke: ${miss.size}`)
  miss.forEach((m) => console.log('  HIÁNY:', m))
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
