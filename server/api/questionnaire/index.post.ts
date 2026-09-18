import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'

/**
 * Kitöltött kérdőív beküldése. Ha a látogató be van jelentkezve, a saját
 * fiókjához kötjük; egyébként a megadott név/e-mail alapján. A staff és a
 * hozzárendelt orvos a páciens adatlapján látja.
 */
const body = z.object({
  type: z.string().min(1).max(40),
  name: z.string().max(200).optional(),
  email: z.string().email().max(200).optional(),
  answers: z.record(z.any()),
})

export default defineEventHandler(async (event) => {
  const { type, name, email, answers } = await readValidatedBody(event, body.parse)

  const session = await getUserSession(event).catch(() => null)
  const userId = (session?.user as { id?: number } | undefined)?.id ?? null

  const saved = await prisma.questionnaireResponse.create({
    data: { type, userId, name: name || null, email: email || null, answers },
    select: { id: true },
  })
  return { ok: true, id: saved.id }
})
