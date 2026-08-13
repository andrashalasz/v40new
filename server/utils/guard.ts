import type { H3Event } from 'h3'
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

/** Cron endpointok védelme megosztott titokkal (fejléc vagy query). */
export function requireCronSecret(event: H3Event) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    throw createError({ statusCode: 500, statusMessage: 'A CRON_SECRET nincs beállítva.' })
  }
  const got =
    getHeader(event, 'x-cron-secret') ?? String(getQuery(event).secret ?? '')

  // Konstans idejű összehasonlítás: hosszalapú kiszivárgás ellen
  const a = Buffer.from(expected)
  const b = Buffer.from(got.padEnd(expected.length).slice(0, expected.length))
  let diff = a.length === b.length ? 0 : 1
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]

  if (diff !== 0) {
    throw createError({ statusCode: 401, statusMessage: 'Érvénytelen titok.' })
  }
}
