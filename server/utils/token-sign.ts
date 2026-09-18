import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * A mobil hozzáférési token aláírása és ellenőrzése.
 *
 * Szándékosan KÜLÖN modul, adatbázis és Nuxt nélkül: ez a rendszer egyik
 * biztonságkritikus pontja, és így önmagában, mellékhatás nélkül tesztelhető
 * (lásd tests/auth/token-sign.test.ts).
 *
 * A formátum egy minimalista, aláírt token: base64url(payload).base64url(hmac).
 * Nem JWT – nincs `alg` mező, ezért az "alg: none" és az algoritmus-csere
 * típusú támadások eleve értelmezhetetlenek rajta. Egy szolgáltatás egyetlen
 * kliensének nem kell a JWT teljes rugalmassága; a kevesebb mozgó alkatrész itt
 * kevesebb hibalehetőséget jelent.
 */

export const ACCESS_TTL_SEC = 15 * 60 // 15 perc

export type AccessPayload = {
  /** felhasználó azonosító */
  uid: number
  /** MobileSession azonosító – kijelentkezéskor ez alapján köthető vissza */
  sid: number
  /** lejárat, epoch másodpercben */
  exp: number
}

/** Hiba, ha a titok hiányzik vagy túl gyenge. A hívó fordítja HTTP-hibává. */
export class TokenSecretError extends Error {}

function secretOf(explicit?: string): string {
  const s = explicit ?? process.env.MOBILE_TOKEN_SECRET ?? process.env.NUXT_SESSION_PASSWORD
  if (!s || s.length < 32) {
    throw new TokenSecretError(
      'A NUXT_SESSION_PASSWORD (vagy MOBILE_TOKEN_SECRET) hiányzik vagy 32 karakternél rövidebb.',
    )
  }
  return s
}

const b64url = (b: Buffer) => b.toString('base64url')

/** Aláírt hozzáférési token. A `now` és a `secret` csak a tesztek kedvéért adható meg. */
export function signAccessToken(
  uid: number,
  sid: number,
  opts: { secret?: string; nowMs?: number; ttlSec?: number } = {},
): { token: string; expiresIn: number } {
  const ttl = opts.ttlSec ?? ACCESS_TTL_SEC
  const payload: AccessPayload = {
    uid,
    sid,
    exp: Math.floor((opts.nowMs ?? Date.now()) / 1000) + ttl,
  }
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  const sig = b64url(createHmac('sha256', secretOf(opts.secret)).update(body).digest())
  return { token: `${body}.${sig}`, expiresIn: ttl }
}

/**
 * Ellenőrzött payload, vagy `null`.
 *
 * Soha nem dob érvénytelen tokenre – a hívó dönt arról, milyen hibát ad vissza.
 * Így nem fordulhat elő, hogy egy kezeletlen kivétel 500-as hibát okoz ott, ahol
 * 401 a helyes válasz.
 */
export function verifyAccessToken(
  token: string,
  opts: { secret?: string; nowMs?: number } = {},
): AccessPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts as [string, string]
  if (!body || !sig) return null

  let expected: Buffer
  let got: Buffer
  try {
    expected = createHmac('sha256', secretOf(opts.secret)).update(body).digest()
    got = Buffer.from(sig, 'base64url')
  } catch (err) {
    // A hiányzó titok konfigurációs hiba, nem érvénytelen token – azt engedjük
    // felszínre törni, különben néma 401-ekké válna egy üzemeltetési hiba.
    if (err instanceof TokenSecretError) throw err
    return null
  }

  // Konstans idejű összehasonlítás. A hosszt előbb nézzük, mert eltérő méretű
  // buffereknél a timingSafeEqual kivételt dobna.
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as AccessPayload
    if (typeof payload.uid !== 'number' || !Number.isInteger(payload.uid)) return null
    if (typeof payload.sid !== 'number' || !Number.isInteger(payload.sid)) return null
    if (typeof payload.exp !== 'number') return null
    if (payload.exp * 1000 <= (opts.nowMs ?? Date.now())) return null
    return payload
  } catch {
    return null
  }
}
