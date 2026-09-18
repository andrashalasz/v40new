import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  compareAround,
  MIN_DAYS_FOR_COMPARE,
  type DailyPoint,
} from '../../server/health/compare.ts'

/**
 * A kezelés előtti/utáni összevetés tesztjei.
 *
 * Ez a funkció orvosi döntést támogat, ezért a hibái nem látszanak a
 * felületen: egy rosszul határolt ablak vagy egy félrecsúszott átlag
 * meggyőzően néz ki, csak épp nem igaz.
 */

/** Napok sorozata egy kezdőnaptól, adott értékekkel. */
function series(startDay: string, values: number[]): DailyPoint[] {
  const start = new Date(`${startDay}T00:00:00Z`)
  return values.map((value, i) => ({
    day: new Date(start.getTime() + i * 86400_000).toISOString().slice(0, 10),
    value,
  }))
}

test('a kezelés napja egyik ablakba sem kerül bele', () => {
  // 09-10 .. 09-20, a kezelés 09-15. Az aznapi érték szándékosan kiugró:
  // ha bekerülne valamelyik átlagba, az látszana az eredményen.
  const points = series('2026-09-10', [10, 10, 10, 10, 10, 999, 20, 20, 20, 20, 20])

  const c = compareAround(points, '2026-09-15', 5)

  assert.equal(c.before.average, 10, 'a kezelés napja nem tartozhat az előtti ablakba')
  assert.equal(c.after.average, 20, 'a kezelés napja nem tartozhat az utáni ablakba')
  assert.equal(c.before.dayCount, 5)
  assert.equal(c.after.dayCount, 5)
})

test('az eltérés abszolút és százalékos alakban is helyes', () => {
  const points = series('2026-09-10', [10, 10, 10, 10, 10, 0, 15, 15, 15, 15, 15])
  const c = compareAround(points, '2026-09-15', 5)

  assert.equal(c.delta, 5)
  assert.equal(c.deltaPercent, 50)
})

test('csökkenésnél negatív az eltérés – irányt mutat, nem minősít', () => {
  const points = series('2026-09-10', [80, 80, 80, 80, 80, 0, 60, 60, 60, 60, 60])
  const c = compareAround(points, '2026-09-15', 5)

  assert.equal(c.delta, -20)
  assert.equal(c.deltaPercent, -25)
})

test('kevés adat esetén NEM megbízhatónak jelöljük', () => {
  // Előtte csak két nap – a küszöb három.
  const points = [
    ...series('2026-09-13', [10, 10]),
    ...series('2026-09-16', [20, 20, 20, 20]),
  ]
  const c = compareAround(points, '2026-09-15', 7)

  assert.equal(c.before.dayCount, 2)
  assert.ok(c.before.dayCount < MIN_DAYS_FOR_COMPARE)
  assert.equal(c.reliable, false, 'két nap alapján nem mondunk trendet')

  // Az átlagot azért kiszámoljuk – az orvos lássa, mi van, csak tudja, hogy kevés.
  assert.equal(c.before.average, 10)
})

test('elegendő adatnál megbízhatónak jelöljük', () => {
  const points = series('2026-09-12', [10, 10, 10, 0, 20, 20, 20])
  const c = compareAround(points, '2026-09-15', 3)

  assert.equal(c.before.dayCount, 3)
  assert.equal(c.after.dayCount, 3)
  assert.equal(c.reliable, true)
})

test('az ablakon kívüli napok nem számítanak bele', () => {
  // Az ablak 3 nap, de van adat jóval korábbról és későbbről is.
  const points = [
    ...series('2026-09-01', [999, 999]), // messze az ablak előtt
    ...series('2026-09-12', [10, 10, 10]),
    ...series('2026-09-16', [20, 20, 20]),
    ...series('2026-09-28', [999, 999]), // messze az ablak után
  ]
  const c = compareAround(points, '2026-09-15', 3)

  assert.equal(c.before.average, 10)
  assert.equal(c.after.average, 20)
  assert.equal(c.before.dayCount, 3)
  assert.equal(c.after.dayCount, 3)
})

test('üres oldal esetén nincs eltérés, nem nulla', () => {
  // Fontos különbség: a "nincs adat" nem ugyanaz, mint a "nem változott".
  const points = series('2026-09-16', [20, 20, 20])
  const c = compareAround(points, '2026-09-15', 3)

  assert.equal(c.before.average, null)
  assert.equal(c.delta, null, 'hiányzó előzmény esetén az eltérés ismeretlen, nem 0')
  assert.equal(c.deltaPercent, null)
  assert.equal(c.reliable, false)
})

test('nulla kiindulási átlagnál nincs százalék, de van abszolút eltérés', () => {
  // Nullával nem osztunk; a különbség viszont értelmes marad.
  const points = series('2026-09-12', [0, 0, 0, 0, 5, 5, 5])
  const c = compareAround(points, '2026-09-15', 3)

  assert.equal(c.before.average, 0)
  assert.equal(c.delta, 5)
  assert.equal(c.deltaPercent, null)
})

test('a szélsőértékek is az ablakból származnak', () => {
  const points = series('2026-09-12', [8, 10, 12, 0, 18, 20, 22])
  const c = compareAround(points, '2026-09-15', 3)

  assert.equal(c.before.min, 8)
  assert.equal(c.before.max, 12)
  assert.equal(c.after.min, 18)
  assert.equal(c.after.max, 22)
  assert.equal(c.before.from, '2026-09-12')
  assert.equal(c.after.to, '2026-09-18')
})
