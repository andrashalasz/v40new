import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'

/**
 * Felhasználó módosítása: alapadatok, e-mail cím, szerepkör, jelszó,
 * aktiválás/deaktiválás. Csak admin.
 *
 * Az e-mail és a szerepkör külön figyelmet kíván, mert mindkettő a
 * BELÉPÉST érinti – egy elgépelés kizárhatja a rendszerből azt, akit módosít.
 */
const body = z.object({
  isActive: z.boolean().optional(),
  email: z.string().email().max(200).optional(),
  firstName: z.string().max(100).nullish(),
  lastName: z.string().max(100).nullish(),
  phone: z.string().max(40).nullish(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  role: z.enum(['USER', 'DOCTOR', 'STAFF', 'ADMIN']).optional(),
  /** Új jelszó beállítása (pl. elfelejtett jelszó pótlása adminból). */
  password: z.string().min(8).max(200).optional(),
})

/** Ezek a szerepek belépnek a felületre, ezért jelszó nélkül értelmetlenek. */
const NEEDS_PASSWORD: readonly string[] = ['DOCTOR', 'STAFF', 'ADMIN']

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })
  }
  const d = await readValidatedBody(event, body.parse)

  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, isActive: true, passwordHash: true },
  })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'A felhasználó nem található.' })

  const data: Record<string, unknown> = {}

  // --- E-mail ---------------------------------------------------------------
  if (d.email !== undefined) {
    const email = d.email.toLowerCase()
    if (email !== current.email) {
      const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } })
      if (taken) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Ezzel az e-mail címmel már van felhasználó.',
        })
      }
      data.email = email
    }
  }

  // --- Szerepkör ------------------------------------------------------------
  if (d.role !== undefined && d.role !== current.role) {
    // Az UTOLSÓ aktív admin szerepkörét nem lehet elvenni: a rendszer
    // gazdátlanná válna, és senki nem tudná visszaállítani.
    if (current.role === 'ADMIN' && d.role !== 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
      if (admins <= 1) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Ez az utolsó admin – előbb vegyél fel másikat.',
        })
      }
    }

    // Belépő szerepkörhöz jelszó kell. Ha a felhasználónak még nincs (pl.
    // foglalásból létrejött fiók), most kell megadni.
    if (NEEDS_PASSWORD.includes(d.role) && !current.passwordHash && !d.password) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Ehhez a szerepkörhöz jelszó kell – add meg egyszerre a szerepkörrel.',
      })
    }

    data.role = d.role
  }

  // --- Deaktiválás ----------------------------------------------------------
  if (d.isActive !== undefined && d.isActive !== current.isActive) {
    if (!d.isActive && current.role === 'ADMIN') {
      const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
      if (admins <= 1) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Ez az utolsó aktív admin – előbb vegyél fel másikat.',
        })
      }
    }
    if (!d.isActive && id === admin.id) {
      throw createError({ statusCode: 400, statusMessage: 'Saját magadat nem deaktiválhatod.' })
    }
    data.isActive = d.isActive
  }

  if (d.password !== undefined) data.passwordHash = await bcrypt.hash(d.password, 12)
  if (d.firstName !== undefined) data.firstName = d.firstName
  if (d.lastName !== undefined) data.lastName = d.lastName
  if (d.phone !== undefined) data.phone = d.phone
  if (d.birthDate !== undefined) {
    data.birthDate = d.birthDate ? new Date(`${d.birthDate}T00:00:00Z`) : null
  }

  if (!Object.keys(data).length) return { ok: true, isActive: current.isActive }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, isActive: true, email: true, role: true },
  })

  // A naplóba SOHA nem kerül jelszó – csak az a tény, hogy változott.
  const { passwordHash, ...loggable } = data
  await audit(event, admin.id, 'user.update', 'User', id, {
    ...loggable,
    ...(passwordHash ? { passwordChanged: true } : {}),
  })

  // Az e-mail vagy a szerepkör változása után a MÁSIK felhasználó meglévő
  // munkamenetei félrevezetőek lennének (régi szerepkörrel), ezért a mobil
  // eszköz-munkameneteit bontjuk. A webes munkamenet a guard.ts miatt amúgy is
  // frissen olvassa a szerepkört.
  if (data.email || data.role || data.passwordHash) {
    await prisma.mobileSession.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  return { ok: true, isActive: user.isActive, email: user.email, role: user.role }
})
