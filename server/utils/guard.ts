import type { H3Event } from 'h3'
import { createHash, timingSafeEqual } from 'node:crypto'
import { prisma } from './prisma'
import { verifyAccessToken } from './token-sign'

const USER_FIELDS = {
  id: true,
  email: true,
  role: true,
  anonymizedAt: true,
  isActive: true,
} as const

const unauthorized = () =>
  createError({ statusCode: 401, statusMessage: 'Bejelentkezés szükséges.' })

/**
 * Bejelentkezett felhasználó, frissen az adatbázisból.
 *
 * KÉTFÉLE belépési pont van, mert kétféle kliens van:
 *   - a weboldal süti-alapú munkamenetet küld (nuxt-auth-utils),
 *   - a mobilalkalmazás `Authorization: Bearer <token>` fejlécet.
 *
 * Mindkét ág UGYANIDE fut be, ezért minden meglévő védett endpoint külön
 * módosítás nélkül működik az appból is. A jogosultság-ellenőrzés egyetlen
 * helyen marad – ez a lényeg: ha két külön helyen lenne, előbb-utóbb
 * elcsúsznának egymástól.
 *
 * A szerepkört MINDIG az adatbázisból olvassuk, mert egy régi sütiben (vagy
 * tokenben) benne maradt "ADMIN" érték egyébként örökké érvényes lenne, még
 * akkor is, ha a jogosultságot közben elvettük.
 */
export async function requireUser(event: H3Event) {
  const bearer = getHeader(event, 'authorization')

  if (bearer?.startsWith('Bearer ')) {
    const payload = verifyAccessToken(bearer.slice(7).trim())
    if (!payload) throw unauthorized()

    // A hozzáférési token aláírt és rövid életű, de önmagában nem visszavonható.
    // Ezért az eszköz-munkamenetet is ellenőrizzük: kijelentkezés vagy egy
    // elveszett készülék letiltása így AZONNAL hat, nem csak a token lejártakor.
    // Ez nem plusz lekérdezés – a felhasználót amúgy is olvasnunk kell.
    const session = await prisma.mobileSession.findUnique({
      where: { id: payload.sid },
      select: { revokedAt: true, expiresAt: true, user: { select: USER_FIELDS } },
    })

    const now = new Date()
    if (!session || session.revokedAt || session.expiresAt < now) throw unauthorized()

    const user = session.user
    if (!user || user.anonymizedAt || !user.isActive || user.id !== payload.uid) {
      throw unauthorized()
    }

    // Az utolsó használat követése az inaktív eszközök kiszűréséhez. Szándékosan
    // nem várjuk meg: a válaszidőt nem éri meg egy statisztikai mezőért növelni.
    void prisma.mobileSession
      .update({ where: { id: payload.sid }, data: { lastUsedAt: now } })
      .catch(() => {})

    return user
  }

  const session = await getUserSession(event)
  const id = (session?.user as { id?: number } | undefined)?.id

  if (!id) throw unauthorized()

  const user = await prisma.user.findUnique({ where: { id }, select: USER_FIELDS })

  if (!user || user.anonymizedAt || !user.isActive) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'A munkamenet érvénytelen.' })
  }

  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    // Szándékosan 404: ne szivárogtassuk, hogy létezik ilyen endpoint.
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  return user
}

/**
 * Staff VAGY orvos. Az orvos csak a hozzárendelt pácienseihez fér – ezt az
 * egyes endpointok a hozzárendelés (PatientDoctor) alapján tovább szűrik.
 */
export async function requireStaffOrDoctor(event: H3Event) {
  const user = await requireUser(event)
  if (!['ADMIN', 'STAFF', 'DOCTOR'].includes(user.role)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  return user
}

/**
 * Cron endpointok védelme megosztott titokkal (fejléc vagy query).
 *
 * A korábbi változat kézzel írt konstans idejű összehasonlítást használt, ami
 * kétszeresen is hibás volt: a `padEnd`/`slice` csonkított, és az indexelés
 * kifutott a rövidebb bufferből. Helyette a Node beépített `timingSafeEqual`-ja
 * van, sha256 hash-ekre alkalmazva – a hash miatt a két bemenet hossza mindig
 * egyezik, így a függvény nem dob, és a hossz sem szivárog ki.
 */
export function requireCronSecret(event: H3Event) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    throw createError({ statusCode: 500, statusMessage: 'A CRON_SECRET nincs beállítva.' })
  }

  const got = getHeader(event, 'x-cron-secret') ?? String(getQuery(event).secret ?? '')
  const digest = (v: string) => createHash('sha256').update(v).digest()

  if (!timingSafeEqual(digest(expected), digest(got))) {
    throw createError({ statusCode: 401, statusMessage: 'Érvénytelen titok.' })
  }
}
