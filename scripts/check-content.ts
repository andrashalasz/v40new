import { prisma } from '../server/utils/prisma'

/**
 * Gyors DB-állapot ellenőrzés telepítés után. Kiírja, betöltött-e minden.
 * Futtatás:  npx tsx scripts/check-content.ts
 */
async function main() {
  const [huC, enC, deC, tr, cat, catActive, svc, langs] = await Promise.all([
    prisma.contentBlock.count({ where: { locale: 'hu' } }),
    prisma.contentBlock.count({ where: { locale: 'en' } }),
    prisma.contentBlock.count({ where: { locale: 'de' } }),
    prisma.translation.count(),
    prisma.serviceCategory.count(),
    prisma.serviceCategory.count({ where: { isActive: true } }),
    prisma.service.count({ where: { archivedAt: null } }),
    prisma.language.findMany({ where: { isActive: true }, select: { code: true } }),
  ])
  console.log('--- V40 Vital tartalom-ellenőrzés ---')
  console.log(`ContentBlock:   HU=${huC}  EN=${enC}  DE=${deC}   (elvárt kb. 318 / 318 / 318)`)
  console.log(`Translation:    ${tr}                        (elvárt kb. 1192)`)
  console.log(`ServiceCategory: összes=${cat}, aktív=${catActive}  (elvárt kb. 15 / 14 aktív)`)
  console.log(`Service:        ${svc}                          (elvárt kb. 25)`)
  console.log(`Aktív nyelvek:  ${langs.map((l) => l.code).join(', ') || '(nincs!)'}   (elvárt: hu, en, de)`)
  console.log('')
  const ok = enC > 100 && deC > 100 && tr > 500 && catActive > 5 && langs.length >= 3
  if (ok) console.log('✅ Rendben – a fordítások és a katalógus betöltve.')
  else {
    console.log('❌ HIÁNYOS. Ha az EN/DE ContentBlock vagy a Translation közel 0:')
    console.log('   futtasd:  npm run db:setup   (vagy: npm run content:import)')
    console.log('   és nézd meg, kiír-e hibát. A tartalom a prisma/content-export.json-ban van.')
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error('Hiba:', e instanceof Error ? e.message : e); process.exit(1) })
