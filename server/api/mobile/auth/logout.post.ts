import { z } from 'zod'
import { revokeMobileSession } from '~~/server/utils/mobile-auth'

/**
 * Kijelentkezés az adott készüléken.
 *
 * Szándékosan NEM igényel érvényes hozzáférési tokent: ha a token épp lejárt,
 * a kijelentkezésnek akkor is működnie kell. A frissítő token ismerete
 * önmagában elegendő jogosultság ahhoz, hogy azt az egy munkamenetet bontsuk.
 *
 * Mindig 204-gyel tér vissza, akkor is, ha a token már érvénytelen volt – így
 * nem derül ki belőle, hogy egy adott token létezik-e.
 */
const body = z.object({
  refreshToken: z.string().min(10).max(200),
})

export default defineEventHandler(async (event) => {
  const parsed = body.safeParse(await readBody(event))
  if (parsed.success) {
    await revokeMobileSession(parsed.data.refreshToken)
  }
  setResponseStatus(event, 204)
  return null
})
