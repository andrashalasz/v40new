import { prisma } from '~~/server/utils/prisma'

/**
 * Publikus, nem érzékeny beállítások a frontendnek (foglalási folyamat):
 * online fizetés / kártya-biztosíték elérhető-e, milyen pénznemben,
 * mennyi a díjmentes lemondási határ.
 */
export default defineCachedEventHandler(
  async () => {
    const s = await prisma.clinicSettings.findUnique({ where: { id: 1 } })
    return {
      currency: s?.currency ?? 'HUF',
      onlinePaymentEnabled: s?.onlinePaymentEnabled ?? true,
      cardGuaranteeEnabled: s?.cardGuaranteeEnabled ?? true,
      freeCancellationHours: s?.freeCancellationHours ?? 24,
      noShowFeePercent: s?.noShowFeePercent ?? 50,
    }
  },
  { maxAge: 30, name: 'public-settings' },
)
