// A megosztott peldanyt hasznaljuk, kulon PrismaClient nem nyilik
// import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { prisma } from './utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Hiányzó adatok!' })
  }

  // Felhasználó keresése
  const user = await prisma.user.findUnique({
    where: { email }
  })

  // Ellenőrzés (biztonsági okokból általános hibaüzenet)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Érvénytelen e-mail vagy jelszó!' })
  }

  // Jelszó összehasonlítása
  // A User.password nullable (jelszo nelkuli, e-mailes belepes is lehet),
  // ezert bcrypt.compare ele explicit ellenorzes kell
  if (!user.password) {
    throw createError({ statusCode: 401, statusMessage: 'Hibás e-mail vagy jelszó!' })
  }

  const isValid = await bcrypt.compare(password, user.password)

  if (!isValid) {
    throw createError({ statusCode: 401, statusMessage: 'Érvénytelen e-mail vagy jelszó!' })
  }

  // Session létrehozása a nuxt-auth-utils segítségével
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  })

  return { success: true }
})