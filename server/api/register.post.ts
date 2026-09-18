import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { audit } from '~~/server/utils/audit'

/**
 * Ügyfél-regisztráció (jelszavas).
 *
 * Fontos: foglaláskor már létrejöhetett egy JELSZÓ NÉLKÜLI fiók ugyanezzel az
 * e-maillel. Ezért nem vakon `create`-elünk (az az egyedi e-mail kulcsba
 * ütközne), hanem összefésülünk: a meglévő soron beállítjuk a jelszót és a
 * hiányzó adatokat. Ha már VAN jelszó, az ügyfél már regisztrált -> lépjen be.
 */
const body = z.object({
  lastName: z.string().min(1).max(100),
  firstName: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().min(6).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Érvényes születési dátum szükséges.'),
  password: z.string().min(8, 'Legalább 8 karakter.').max(200),
  privacyAccepted: z.literal(true, { errorMap: () => ({ message: 'Az adatkezelés elfogadása kötelező.' }) }),
  marketingConsent: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Érvénytelen adat.',
      data: { fields: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])) },
    })
  }
  const d = parsed.data
  const email = d.email.toLowerCase()

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, anonymizedAt: true },
  })
  if (existing?.passwordHash) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ezzel az e-mail címmel már van fiók. Kérlek jelentkezz be.',
    })
  }

  const passwordHash = await bcrypt.hash(d.password, 12)
  const now = new Date()
  const birthDate = new Date(`${d.birthDate}T00:00:00Z`)

  let user: { id: number; email: string; role: 'ADMIN' | 'STAFF' | 'DOCTOR' | 'USER' }
  try {
    user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        lastName: d.lastName,
        firstName: d.firstName,
        phone: d.phone,
        birthDate,
        privacyAcceptedAt: now,
        marketingConsentAt: d.marketingConsent ? now : null,
        anonymizedAt: null,
      },
      create: {
        email,
        passwordHash,
        role: 'USER',
        lastName: d.lastName,
        firstName: d.firstName,
        phone: d.phone,
        birthDate,
        privacyAcceptedAt: now,
        marketingConsentAt: d.marketingConsent ? now : null,
      },
      select: { id: true, email: true, role: true },
    })
  } catch (err) {
    // A generikus "Server Error" helyett kiderítjük az OKOT. A leggyakoribb éles
    // hiba: elavult adatbázis-séma (hiányzó oszlop/tábla, mert nem futott le a
    // `prisma migrate deploy`). Ilyenkor konkrét üzenetet adunk.
    console.error('[register] adatbázis-hiba:', err)
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2022' || err.code === 'P2021')) {
      const missing = (err.meta?.column ?? err.meta?.table ?? '') as string
      throw createError({
        statusCode: 500,
        statusMessage: `Elavult adatbázis-séma${missing ? ` (hiányzik: ${missing})` : ''}. A szerveren futtatandó: npx prisma migrate deploy`,
      })
    }
    throw createError({ statusCode: 500, statusMessage: 'A regisztráció nem sikerült (adatbázis-hiba). Nézd meg a szerver naplóját: pm2 logs v40' })
  }

  await setUserSession(event, { user: { id: user.id, email: user.email, role: user.role } })
  await audit(event, user.id, 'auth.register', 'User', user.id)

  return { success: true }
})
