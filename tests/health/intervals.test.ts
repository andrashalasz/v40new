import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coveredHours, mergeIntervals } from '../../mobile/src/health/intervals.ts'

/**
 * Átfedő alvás-szakaszok összevonása.
 *
 * Ez a rendszer egyik olyan pontja, ahol a hiba HIHETŐ adatot gyárt: ha két
 * eszköz ugyanazt az éjszakát rögzíti és összeadnánk, 14 óra alvás jelenne meg
 * az orvos képernyőjén. Nem hibaüzenet, csak egy rossz szám – ezért kell rá
 * teszt.
 */

/** Órák -> ezredmásodperc egy fix naptól számítva, a teszt olvashatóságáért. */
const H = (hours: number) => new Date('2026-09-18T00:00:00Z').getTime() + hours * 3_600_000
const iv = (fromHour: number, toHour: number) => ({ start: H(fromHour), end: H(toHour) })

test('nem átfedő szakaszok hossza összeadódik', () => {
  // 23:00–02:00 és 03:00–07:00 -> 3 + 4 óra
  assert.equal(coveredHours([iv(23, 26), iv(27, 31)]), 7)
})

test('KÉT FORRÁS ugyanarra az éjszakára nem duplázódik', () => {
  // A Whoop és az Apple Watch is rögzíti a 23:00–06:00 alvást.
  const whoop = iv(23, 30)
  const watch = iv(23, 30)

  assert.equal(coveredHours([whoop, watch]), 7, 'két azonos szakasz is 7 óra, nem 14')
})

test('részben átfedő források esetén a teljes lefedett idő számít', () => {
  // Whoop: 22:30–06:00, Apple Watch: 23:00–06:30 -> együtt 22:30–06:30 = 8 óra
  assert.equal(coveredHours([iv(22.5, 30), iv(23, 30.5)]), 8)
})

test('a beágyazott szakasz nem növeli az eredményt', () => {
  // A 23–30 óra a 18-án 23:00-tól 19-én 06:00-ig tart. A 25–26 (19-én
  // 01:00–02:00) teljesen ezen BELÜL van, tehát nem ad hozzá semmit.
  assert.equal(coveredHours([iv(23, 30), iv(25, 26)]), 7)

  // Egy KÍVÜL eső szakasz viszont igen: 18-án 01:00–02:00 külön epizód.
  assert.equal(coveredHours([iv(23, 30), iv(1, 2)]), 8)
})

test('az egymáshoz PONTOSAN érő szakaszok összeolvadnak', () => {
  // Az órák gyakran percenkénti szakaszokban rögzítenek. A 23:00–00:00 és a
  // 00:00–01:00 két óra összefüggő alvás, nem két külön epizód.
  const merged = mergeIntervals([iv(23, 24), iv(24, 25)])
  assert.equal(merged.length, 1, 'egyetlen szakasszá kell összeolvadniuk')
  assert.equal(coveredHours([iv(23, 24), iv(24, 25)]), 2)
})

test('a sorrend nem számít', () => {
  const a = coveredHours([iv(23, 26), iv(20, 22), iv(27, 31)])
  const b = coveredHours([iv(27, 31), iv(23, 26), iv(20, 22)])
  assert.equal(a, b)
})

test('sok apró, átfedő szakasz (percenkénti rögzítés) helyesen áll össze', () => {
  // 60 darab egyperces szakasz, mindegyik fél perc átfedéssel a következővel.
  const parts = []
  for (let i = 0; i < 60; i++) {
    const startMin = i * 0.5
    parts.push({ start: H(23) + startMin * 60_000, end: H(23) + (startMin + 1) * 60_000 })
  }
  // 0-tól 30.5 percig tart a lefedés -> 30,5 perc
  assert.equal(Math.round(coveredHours(parts) * 60 * 10) / 10, 30.5)
})

test('érvénytelen szakaszokat eldob, nem számol velük', () => {
  const bad = [
    { start: H(23), end: H(23) }, // nulla hosszú
    { start: H(24), end: H(23) }, // fordított
    { start: Number.NaN, end: H(25) },
    { start: H(23), end: Number.POSITIVE_INFINITY },
  ]
  assert.equal(coveredHours(bad), 0)

  // A jó szakasz a rosszak között is megmarad.
  assert.equal(coveredHours([...bad, iv(23, 30)]), 7)
})

test('üres bemenetre nulla', () => {
  assert.equal(coveredHours([]), 0)
  assert.deepEqual(mergeIntervals([]), [])
})

test('három forrás, szétszórt átfedésekkel', () => {
  // Whoop 22:00–05:00, Oura 23:00–06:00, iPhone 04:30–07:00
  // Együtt: 22:00–07:00 = 9 óra (nem 7 + 7 + 2,5 = 16,5)
  assert.equal(coveredHours([iv(22, 29), iv(23, 30), iv(28.5, 31)]), 9)
})
