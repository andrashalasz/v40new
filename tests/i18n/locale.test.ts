import { test } from 'node:test'
import assert from 'node:assert/strict'

/**
 * A nyelvválasztás szabályai.
 *
 * A logikát a mobilalkalmazás `src/i18n/index.tsx` fájlja tartalmazza, de az
 * `expo-localization`-t importál, ami Node alatt nem tölthető be. Ezért a
 * DÖNTÉSI szabály itt, bemenetre bontva szerepel – ez az a rész, ami elromolhat.
 *
 * A szabály: a telefon nyelvei sorrendben; az első támogatott nyeri; ha egyik
 * sem támogatott, ANGOL (nem magyar).
 */

const SUPPORTED = ['hu', 'en', 'de'] as const
type Locale = (typeof SUPPORTED)[number]
const FALLBACK: Locale = 'en'

/** Ugyanaz a logika, mint a mobile/src/i18n/index.tsx `resolveLocale`-jában. */
function resolveLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const code = tag.toLowerCase().split('-')[0]
    const hit = SUPPORTED.find((s) => s === code)
    if (hit) return hit
  }
  return FALLBACK
}

test('a telefon nyelve dönt, ha támogatjuk', () => {
  assert.equal(resolveLocale(['hu']), 'hu')
  assert.equal(resolveLocale(['de']), 'de')
  assert.equal(resolveLocale(['en']), 'en')
})

test('a régió nem számít, csak a nyelv', () => {
  // Osztrák német, svájci német, brit angol, amerikai angol
  assert.equal(resolveLocale(['de-AT']), 'de')
  assert.equal(resolveLocale(['de-CH']), 'de')
  assert.equal(resolveLocale(['en-GB']), 'en')
  assert.equal(resolveLocale(['en-US']), 'en')
  assert.equal(resolveLocale(['hu-HU']), 'hu')
})

test('a nagybetűs nyelvkód is működik', () => {
  assert.equal(resolveLocale(['DE']), 'de')
  assert.equal(resolveLocale(['HU-hu']), 'hu')
})

test('nem támogatott nyelv esetén ANGOL, nem magyar', () => {
  // Ez a lényeg: egy japán vagy lengyel telefonnal érkező vendégnek az angol
  // segít, a magyar nem. Ha ez a teszt elbukik, a szabály sérült.
  assert.equal(resolveLocale(['ja']), 'en')
  assert.equal(resolveLocale(['pl-PL']), 'en')
  assert.equal(resolveLocale(['zh-Hans-CN']), 'en')
  assert.equal(resolveLocale([]), 'en')
})

test('a preferencia-sorrendet tiszteletben tartjuk', () => {
  // A felhasználó több nyelvet állíthat be; az első támogatott nyer.
  assert.equal(resolveLocale(['sk', 'de', 'en']), 'de')
  assert.equal(resolveLocale(['ja', 'pl', 'hu']), 'hu')

  // Egy nem támogatott nyelv az első helyen NEM nyomja el a mögötte állót.
  assert.equal(resolveLocale(['fi', 'en']), 'en')
})

test('üres és hibás bejegyzések nem okoznak hibát', () => {
  assert.equal(resolveLocale(['', 'de']), 'de')
  assert.equal(resolveLocale(['-', 'x-y-z']), 'en')
})
