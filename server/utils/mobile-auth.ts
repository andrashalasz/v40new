import { createHash, randomBytes } from 'node:crypto'
import { prisma } from './prisma'
import { signAccessToken } from './token-sign'

/**
 * MOBIL HITELESÍTÉS – token-alapú munkamenet a natív alkalmazásoknak.
 *
 * A weboldal süti-alapú munkamenetet használ (nuxt-auth-utils). Natív appból ez
 * nem járható út: nincs megbízható süti-kezelés, és a süti CSRF-védelme is a
 * böngésző modelljére épül. Az app ezért `Authorization: Bearer <token>`
 * fejlécet küld.
 *
 * Két token van, szándékosan eltérő élettartammal:
 *
 *   HOZZÁFÉRÉSI token  – 15 perc, ALÁÍRT, nem tároljuk adatbázisban.
 *     Minden kérésnél ezt küldi az app. Rövid élettartamú, mert ha kiszivárog,
 *     hamar lejár. Az aláírás miatt nem kell hozzá adatbázis-olvasás.
 *
 *   FRISSÍTŐ token     – 60 nap, OPAQUE, hash-elve tároljuk (MobileSession).
 *     Csak a token cseréjéhez használható. Azért tároljuk, hogy bármikor
 *     VISSZAVONHATÓ legyen (kijelentkezés, eszköz elvesztése, deaktiválás).
 *
 * Egészségügyi adatot kezelő appnál ez a különválasztás nem formaság: a hosszú
 * életű titok soha nem utazik minden egyes kéréssel, a rövid életű pedig nem
 * vonható vissza – de nem is kell, mert magától elévül.
 */

const REFRESH_TTL_DAYS = 60

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

export type DeviceInfo = {
  platform?: string | null
  deviceName?: string | null
  appVersion?: string | null
  pushToken?: string | null
}

/** Új eszköz-munkamenet: visszaadja a nyers frissítő tokent (csak most látszik). */
export async function createMobileSession(userId: number, device: DeviceInfo) {
  const refreshToken = randomBytes(32).toString('base64url')
  const session = await prisma.mobileSession.create({
    data: {
      userId,
      refreshTokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000),
      platform: device.platform ?? null,
      deviceName: device.deviceName ?? null,
      appVersion: device.appVersion ?? null,
      pushToken: device.pushToken ?? null,
    },
    select: { id: true },
  })

  const access = signAccessToken(userId, session.id)
  return {
    sessionId: session.id,
    refreshToken,
    accessToken: access.token,
    expiresIn: access.expiresIn,
  }
}

/**
 * Frissítő token beváltása – ROTÁCIÓVAL.
 *
 * A régi token azonnal érvénytelen lesz, és új pár jön helyette. Ha egy már
 * visszavont tokennel érkezik kérés, az lopott tokenre utal (a jogos eszköz
 * időközben rotált), ezért a felhasználó MINDEN eszköz-munkamenetét bontjuk.
 */
export async function rotateMobileSession(refreshToken: string, device: DeviceInfo) {
  const hash = sha256(refreshToken)
  const session = await prisma.mobileSession.findUnique({
    where: { refreshTokenHash: hash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: { id: true, isActive: true, anonymizedAt: true } },
    },
  })

  const invalid = () =>
    createError({ statusCode: 401, statusMessage: 'A munkamenet lejárt, jelentkezz be újra.' })

  if (!session) throw invalid()

  if (session.revokedAt) {
    // Újrafelhasznált token: vagy lopás, vagy a rotáció félbeszakadt. Mindkét
    // esetben a biztonságos válasz a teljes kiléptetés.
    await prisma.mobileSession.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    throw invalid()
  }

  if (session.expiresAt < new Date()) throw invalid()
  if (!session.user.isActive || session.user.anonymizedAt) throw invalid()

  const nextToken = randomBytes(32).toString('base64url')
  const now = new Date()

  // Egy tranzakcióban: a régit visszavonjuk, az újat létrehozzuk. Így nem
  // maradhat olyan állapot, amelyben mindkettő – vagy egyik sem – érvényes.
  const next = await prisma.$transaction(async (tx) => {
    await tx.mobileSession.update({
      where: { id: session.id },
      data: { revokedAt: now },
    })
    return tx.mobileSession.create({
      data: {
        userId: session.userId,
        refreshTokenHash: sha256(nextToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000),
        platform: device.platform ?? null,
        deviceName: device.deviceName ?? null,
        appVersion: device.appVersion ?? null,
        pushToken: device.pushToken ?? null,
        lastUsedAt: now,
      },
      select: { id: true },
    })
  })

  const access = signAccessToken(session.userId, next.id)
  return {
    sessionId: next.id,
    refreshToken: nextToken,
    accessToken: access.token,
    expiresIn: access.expiresIn,
  }
}

/** Kijelentkezés: az adott eszköz munkamenetének visszavonása. */
export async function revokeMobileSession(refreshToken: string) {
  await prisma.mobileSession.updateMany({
    where: { refreshTokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}
