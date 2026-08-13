import type { H3Event } from 'h3'
import { createHash, timingSafeEqual } from 'node:crypto'
import { prisma } from './prisma'

/**
 * Bejelentkezett felhasználó, frissen az adatbázisból.
 *
 * A session csak az id-t hordozza: a szerepkört MINDIG onnan olvassuk, mert egy
 * régi sütiben benne maradt "ADMIN" érték egyébként örökké érvényes lenne, még
 * akkor is, ha a jogosultságot közben elvettük.
 */
export async function requireUser(event: H3Event) {
  const session = await getUserSession(event)
  const id = (session?.user as { id?: number } | undefined)?.id

  if (!id) {
    throw createError({ statusCode: 401, statusMessage: 'Bejelentkezés szükséges.' })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, anonymizedAt: true },
  })

  if (!user || user.anonymizedAt) {
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
