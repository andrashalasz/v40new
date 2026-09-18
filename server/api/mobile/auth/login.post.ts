import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { audit } from '~~/server/utils/audit'
import { createMobileSession } from '~~/server/utils/mobile-auth'

/**
 * Bejelentkezés a mobilalkalmazásból.
 *
 * Ugyanaz a jelszó-ellenőrzés, mint a webes /api/login-nál, de süti helyett
 * token-párt ad vissza. A választ az app a készülék biztonságos tárolójában
 * (iOS Keychain / Android Keystore) őrzi, nem sima fájlban.
 */
const body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
  device: z
    .object({
      platform: z.enum(['ios', 'android']).optional(),
      deviceName: z.string().max(120).optional(),
      appVersion: z.string().max(40).optional(),
      pushToken: z.string().max(200).optional(),
    })
    .optional(),
})

export default defineEventHandler(async (event) => {
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Hiányzó vagy hibás adatok!' })
  }
  const email = parsed.data.email.toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      passwordHash: true,
      anonymizedAt: true,
      isActive: true,
    },
  })

  // Egységes hibaüzenet: nem szivárogtatjuk, hogy létezik-e a cím.
  const invalid = () =>
    createError({ statusCode: 401, statusMessage: 'Érvénytelen e-mail vagy jelszó!' })

  if (!user || user.anonymizedAt || !user.isActive || !user.passwordHash) {
    // Időzítés-kiegyenlítés: hash nélkül a válasz észrevehetően gyorsabb lenne.
    await bcrypt.compare(parsed.data.password, '$2b$12$' + 'x'.repeat(53))
    throw invalid()
  }

  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    await audit(event, user.id, 'auth.mobile.login.failed', 'User', user.id)
    throw invalid()
  }

  const tokens = await createMobileSession(user.id, parsed.data.device ?? {})
  await audit(event, user.id, 'auth.mobile.login', 'User', user.id)

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  }
})
