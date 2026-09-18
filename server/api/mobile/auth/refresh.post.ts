import { z } from 'zod'
import { rotateMobileSession } from '~~/server/utils/mobile-auth'

/**
 * Token-frissítés.
 *
 * Az app akkor hívja, ha a hozzáférési token lejárt (15 perc). A frissítő token
 * MINDEN beváltáskor cserélődik, tehát a válaszban kapott újat kell elmenteni –
 * a régi azonnal érvénytelen.
 */
const body = z.object({
  refreshToken: z.string().min(10).max(200),
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
    throw createError({ statusCode: 400, statusMessage: 'Hiányzó frissítő token.' })
  }

  const tokens = await rotateMobileSession(parsed.data.refreshToken, parsed.data.device ?? {})

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  }
})
