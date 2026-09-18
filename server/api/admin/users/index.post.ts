import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'

/**
 * Új felhasználó felvitele az adminból: páciens (USER), orvos (DOCTOR),
 * munkatárs (STAFF) vagy admin (ADMIN).
 *
 * Aki BELÉP a felületre (orvos, munkatárs, admin), annak jelszó kötelező –
 * jelszó nélküli belépő fiók csak félkész állapotot jelentene. Páciensnél
 * opcionális: a foglalásból létrejövő fiók is jelszó nélküli, és e-mailes
 * belépő linkkel használható.
 */
const body = z.object({
  email: z.string().email().max(200),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  role: z.enum(['USER', 'DOCTOR', 'STAFF', 'ADMIN']),
  password: z.string().min(8).max(200).optional(),
})

/** Ezek a szerepek belépnek a felületre, ezért jelszó nélkül értelmetlenek. */
const NEEDS_PASSWORD = ['DOCTOR', 'STAFF', 'ADMIN'] as const

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const d = await readValidatedBody(event, body.parse)
  const email = d.email.toLowerCase()

  if ((NEEDS_PASSWORD as readonly string[]).includes(d.role) && !d.password) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Ehhez a szerepkörhöz jelszó megadása kötelező (a felülethez belép).',
    })
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Ezzel az e-mail címmel már van felhasználó.' })

  const user = await prisma.user.create({
    data: {
      email,
      role: d.role,
      firstName: d.firstName || null,
      lastName: d.lastName || null,
      phone: d.phone || null,
      birthDate: d.birthDate ? new Date(`${d.birthDate}T00:00:00Z`) : null,
      passwordHash: d.password ? await bcrypt.hash(d.password, 12) : null,
    },
    select: { id: true, email: true, role: true },
  })

  await audit(event, admin.id, 'user.create', 'User', user.id, { role: user.role })
  return { ok: true, id: user.id }
})
