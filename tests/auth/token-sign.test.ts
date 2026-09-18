import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  signAccessToken,
  verifyAccessToken,
  TokenSecretError,
} from '../../server/utils/token-sign.ts'

/**
 * A mobil hozzáférési token aláírásának tesztjei.
 *
 * Ez a rendszer egyik olyan pontja, ahol egy csendes hiba nem látszik a
 * felületen: egy elrontott ellenőrzés nem hibaüzenetet ad, hanem beengedi az
 * illetéktelent. Ezért itt nem az a kérdés, hogy a helyes token működik-e –
 * hanem hogy a HIBÁS tokenek MIND elbuknak-e.
 */

const SECRET = 'teszt-titok-legalabb-harminckét-karakter-hosszu'
const NOW = Date.UTC(2026, 8, 18, 12, 0, 0) // 2026-09-18 12:00 UTC

test('a kiadott token visszaolvasható', () => {
  const { token, expiresIn } = signAccessToken(42, 7, { secret: SECRET, nowMs: NOW })
  const payload = verifyAccessToken(token, { secret: SECRET, nowMs: NOW })

  assert.ok(payload, 'az érvényes tokennek vissza kell jönnie')
  assert.equal(payload.uid, 42)
  assert.equal(payload.sid, 7)
  assert.equal(expiresIn, 900, 'a hozzáférési token 15 percig él')
})

test('lejárt token nem fogadható el', () => {
  const { token } = signAccessToken(1, 1, { secret: SECRET, nowMs: NOW, ttlSec: 60 })

  // Egy másodperccel a lejárat után
  const after = NOW + 61_000
  assert.equal(verifyAccessToken(token, { secret: SECRET, nowMs: after }), null)

  // Pontosan a lejárat pillanatában már NEM érvényes (a határ zárt)
  const exact = NOW + 60_000
  assert.equal(verifyAccessToken(token, { secret: SECRET, nowMs: exact }), null)

  // Egy másodperccel előtte még igen
  assert.ok(verifyAccessToken(token, { secret: SECRET, nowMs: NOW + 59_000 }))
})

test('más titokkal aláírt token nem fogadható el', () => {
  const { token } = signAccessToken(1, 1, { secret: SECRET, nowMs: NOW })
  const other = 'masik-titok-szinten-harminckét-karakter-hosszu'

  assert.equal(verifyAccessToken(token, { secret: other, nowMs: NOW }), null)
})

test('a payload nem írható át az aláírás nélkül', () => {
  // A támadó a saját tokenjéből kiolvassa a payloadot, átírja admin
  // azonosítóra, és visszateszi az EREDETI aláírást.
  const { token } = signAccessToken(2, 1, { secret: SECRET, nowMs: NOW })
  const [body, sig] = token.split('.') as [string, string]

  const tampered = JSON.parse(Buffer.from(body, 'base64url').toString())
  tampered.uid = 1 // "legyek én az 1-es felhasználó"
  const forgedBody = Buffer.from(JSON.stringify(tampered)).toString('base64url')

  assert.equal(verifyAccessToken(`${forgedBody}.${sig}`, { secret: SECRET, nowMs: NOW }), null)
})

test('a lejárat sem hosszabbítható meg', () => {
  const { token } = signAccessToken(1, 1, { secret: SECRET, nowMs: NOW, ttlSec: 60 })
  const [body, sig] = token.split('.') as [string, string]

  const tampered = JSON.parse(Buffer.from(body, 'base64url').toString())
  tampered.exp = Math.floor(NOW / 1000) + 10 * 365 * 86400 // tíz év
  const forgedBody = Buffer.from(JSON.stringify(tampered)).toString('base64url')

  assert.equal(verifyAccessToken(`${forgedBody}.${sig}`, { secret: SECRET, nowMs: NOW }), null)
})

test('formailag hibás tokenek nem dobnak kivételt, csak elutasítanak', () => {
  // Ha bármelyik 500-as hibát okozna, egy hibás kérésből üzemzavar lenne.
  const junk = [
    '',
    '.',
    '..',
    'egyetlen-resz',
    'harom.resz.van',
    'nem-base64!.nem-base64!',
    Buffer.from('{"uid":1}').toString('base64url') + '.', // üres aláírás
    Buffer.from('nem json').toString('base64url') + '.' + 'x'.repeat(43),
  ]

  for (const t of junk) {
    assert.equal(
      verifyAccessToken(t, { secret: SECRET, nowMs: NOW }),
      null,
      `ezt el kellett volna utasítani: ${JSON.stringify(t)}`,
    )
  }
})

test('nem szám típusú azonosító nem fogadható el', () => {
  // Aláírással EGYÜTT hamisítunk: a támadó ismeri a titkot? Nem – de ha egy
  // másik hiba miatt mégis alá tudna írni, a típusellenőrzésnek akkor is fognia
  // kell. Ezért a payload tartalmát önmagában is validáljuk.
  const forge = (payload: unknown) => {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = createHmac('sha256', SECRET).update(body).digest('base64url')
    return `${body}.${sig}`
  }

  const exp = Math.floor(NOW / 1000) + 900
  assert.equal(verifyAccessToken(forge({ uid: '1', sid: 1, exp }), { secret: SECRET, nowMs: NOW }), null)
  assert.equal(verifyAccessToken(forge({ uid: 1.5, sid: 1, exp }), { secret: SECRET, nowMs: NOW }), null)
  assert.equal(verifyAccessToken(forge({ sid: 1, exp }), { secret: SECRET, nowMs: NOW }), null)
  assert.equal(verifyAccessToken(forge({ uid: 1, exp }), { secret: SECRET, nowMs: NOW }), null)

  // A helyes alak viszont átmegy – különben a teszt akkor is "zöld" lenne, ha
  // a függvény mindig null-t adna vissza.
  assert.ok(verifyAccessToken(forge({ uid: 1, sid: 1, exp }), { secret: SECRET, nowMs: NOW }))
})

test('túl rövid titok esetén hibát jelez, nem csendben gyengít', () => {
  assert.throws(
    () => signAccessToken(1, 1, { secret: 'rovid', nowMs: NOW }),
    TokenSecretError,
  )
})

test('két különböző munkamenet tokenje nem cserélhető fel', () => {
  const a = signAccessToken(1, 100, { secret: SECRET, nowMs: NOW })
  const b = signAccessToken(1, 200, { secret: SECRET, nowMs: NOW })

  assert.notEqual(a.token, b.token, 'a munkamenet-azonosítónak látszania kell a tokenben')
  assert.equal(verifyAccessToken(a.token, { secret: SECRET, nowMs: NOW })?.sid, 100)
  assert.equal(verifyAccessToken(b.token, { secret: SECRET, nowMs: NOW })?.sid, 200)
})
