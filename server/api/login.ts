import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { audit } from '~~/server/utils/audit'

/**
 * Bejelentkezés e-maillel és jelszóval.
 *
 * A `User.password` mezőt az új séma `passwordHash`-re nevezte át – a korábbi
 * kód még a régi nevet használta, ami a bejelentkezést futásidőben elhasította
 * volna (a típusellenőrzés fogta ki).
 *
 * A jelszó nullable, mert a foglaláskor automatikusan létrejövő fiókoknak nincs
 * jelszava; azok e-mailes belépő linkkel jelentkeznek be.
 */
const body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
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
      passwordHash: true,
      anonymizedAt: true,
    },
  })

  // Egységes hibaüzenet: nem szivárogtatjuk, hogy létezik-e a cím.
  const invalid = () =>
    createError({ statusCode: 401, statusMessage: 'Érvénytelen e-mail vagy jelszó!' })

  if (!user || user.anonymizedAt || !user.passwordHash) {
    // Időzítés-kiegyenlítés: hash nélkül a válasz észrevehetően gyorsabb lenne,
    // amiből ki lehetne találni, hogy a cím nem létezik.
    await bcrypt.compare(parsed.data.password, '$2b$12$' + 'x'.repeat(53))
    throw invalid()
  }

  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    await audit(event, user.id, 'auth.login.failed', 'User', user.id)
    throw invalid()
  }

  await setUserSession(event, {
    user: { id: user.id, email: user.email, role: user.role },
  })
  await audit(event, user.id, 'auth.login', 'User', user.id)

  return { success: true }
})
