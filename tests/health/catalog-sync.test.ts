import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES } from '../../server/health/catalog.ts'
import {
  QUANTITY_METRICS,
  METRICS_BY_CATEGORY,
} from '../../mobile/src/health/metrics.ts'

/**
 * A telefonos és a szerveroldali mérés-lista összhangja.
 *
 * Két külön fájl írja le ugyanazokat a méréseket: a szerveré a MEGJELENÍTÉST
 * (mit hogyan rajzolunk), a telefoné a BEOLVASÁST (melyik HealthKit típus,
 * milyen egységben). A típusrendszer nem köti össze őket, mert két külön
 * csomagban vannak.
 *
 * Ha elcsúsznak, az csendes hiba: az app olyan mérést küld, amit a szerver
 * eldob (és a felhasználó csak annyit lát, hogy „nincs adat"), vagy a szerver
 * olyan diagramot kínál, amihez soha nem érkezik érték. Egyik sem okoz
 * hibaüzenetet – ezért kell rá teszt.
 */

const serverMetricKeys = new Set(CATEGORIES.flatMap((c) => c.metrics.map((m) => m.key)))
const serverCategoryKeys = new Set(CATEGORIES.map((c) => c.key))

test('a telefon minden mérése létezik a szerver katalógusában', () => {
  for (const key of Object.values(METRICS_BY_CATEGORY).flat()) {
    assert.ok(
      serverMetricKeys.has(key),
      `a telefon a(z) "${key}" mérést küldené, de a szerver katalógusa nem ismeri – a szinkron eldobná`,
    )
  }
})

test('a szerver minden mérését be is olvassa a telefon', () => {
  const phoneKeys = new Set(Object.values(METRICS_BY_CATEGORY).flat())
  for (const key of serverMetricKeys) {
    assert.ok(
      phoneKeys.has(key),
      `a szerver mutatna "${key}" diagramot, de a telefon sosem olvassa be – örökké üres maradna`,
    )
  }
})

test('a kategóriák kulcsai egyeznek', () => {
  for (const category of Object.keys(METRICS_BY_CATEGORY)) {
    assert.ok(
      serverCategoryKeys.has(category),
      `ismeretlen kategória a telefonon: "${category}" – a hozzájárulás-ellenőrzés elutasítaná`,
    )
  }
  assert.equal(
    Object.keys(METRICS_BY_CATEGORY).length,
    serverCategoryKeys.size,
    'a két oldal kategóriáinak SZÁMA is egyezzen',
  )
})

test('a mérés ugyanabban a kategóriában van mindkét oldalon', () => {
  for (const c of CATEGORIES) {
    const phone = METRICS_BY_CATEGORY[c.key] ?? []
    for (const m of c.metrics) {
      assert.ok(
        phone.includes(m.key),
        `"${m.key}" a szerveren a(z) "${c.label}" kategóriában van, a telefonon viszont nem – ` +
          'a hozzájárulás a rossz kategóriához szólna',
      )
    }
  }
})

test('az összesítés módja megegyezik', () => {
  // Ha a szerver összegként rajzolná ki azt, amit a telefon átlagként küld,
  // az üres diagramot adna: a szerver a `sum` mezőt olvasná, ami null.
  const serverAggregation = new Map(
    CATEGORIES.flatMap((c) => c.metrics.map((m) => [m.key, m.aggregation] as const)),
  )

  for (const m of QUANTITY_METRICS) {
    const expected = serverAggregation.get(m.key)
    assert.equal(
      m.aggregation,
      expected,
      `"${m.key}": a telefon "${m.aggregation}", a szerver "${expected}" szerint összesít`,
    )
  }
})

test('minden mérésnek van iOS azonosítója a szerver katalógusában', () => {
  // A katalógus ezt adja vissza az appnak; enélkül az engedélykérés hiányos.
  for (const c of CATEGORIES) {
    for (const m of c.metrics) {
      assert.ok(m.ios, `"${m.key}" mérésnek nincs HealthKit azonosítója`)
    }
  }
})
