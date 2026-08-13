import { prisma } from '~~/server/utils/prisma'

/** Publikus bérlet-katalógus a /berletek oldalhoz. */
export default defineCachedEventHandler(
  async () => {
    const rows = await prisma.passTemplate.findMany({
      where: { archivedAt: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        desc: true,
        priceGross: true,
        vatRate: true,
        sessionCount: true,
        validityDays: true,
        transferable: true,
        picUrl: true,
        services: {
          select: { sessionsPerUse: true, service: { select: { title: true, slug: true, priceGross: true } } },
        },
      },
    })

    return rows.map((p) => {
      // Listaár: a legdrágább fedezett kezelés alkalmankénti ára szorozva az
      // alkalmakkal. Ez az összehasonlítási alap, amit az ügyfél is látni akar.
      const unit = Math.max(0, ...p.services.map((s) => s.service.priceGross))
      const list = p.sessionCount ? unit * p.sessionCount : 0
      return {
        ...p,
        services: p.services.map((s) => s.service),
        listPriceGross: list,
        savingGross: Math.max(0, list - p.priceGross),
      }
    })
  },
  { maxAge: 60, name: 'public-passes' },
)
