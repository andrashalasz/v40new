import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * A klinika beállításai az adminnak. A rekord id=1 (egyetlen sor); ha még nincs,
 * létrehozzuk az alapértelmezésekkel. A fizetési szolgáltatók titkos kulcsai
 * NEM itt vannak (azok környezeti változók) – csak azt jelezzük vissza, él-e a
 * valódi Stripe/Számlázz.hu, vagy Mock fut.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const settings = await prisma.clinicSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  })

  return {
    settings,
    providerStatus: {
      stripeLive: !!process.env.STRIPE_SECRET_KEY,
      invoiceLive: !!process.env.SZAMLAZZHU_AGENT_KEY,
    },
  }
})
