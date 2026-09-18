import { prisma } from '~~/server/utils/prisma'
import { entityTranslations } from '~~/server/utils/i18n'

/** Publikus bérlet-katalógus a /berletek oldalhoz (nyelvfüggő). */
export default defineCachedEventHandler(
  async (event) => {
    const locale = String(getQuery(event).locale ?? 'hu')

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
          select: { sessionsPerUse: true, service: { select: { id: true, title: true, slug: true, priceGross: true } } },
        },
      },
    })

    // Fordítások: bérlet-sablon (title/desc) és a fedett szolgáltatások (title).
    const passTr = await entityTranslations('PassTemplate', rows.map((r) => r.id), locale)
    const svcIds = rows.flatMap((r) => r.services.map((s) => s.service.id))
    const svcTr = await entityTranslations('Service', svcIds, locale)

    return rows.map((p) => {
      const unit = Math.max(0, ...p.services.map((s) => s.service.priceGross))
      const list = p.sessionCount ? unit * p.sessionCount : 0
      return {
        ...p,
        title: passTr[p.id]?.title ?? p.title,
        desc: passTr[p.id]?.desc ?? p.desc,
        services: p.services.map((s) => ({
          title: svcTr[s.service.id]?.title ?? s.service.title,
          slug: s.service.slug,
        })),
        listPriceGross: list,
        savingGross: Math.max(0, list - p.priceGross),
      }
    })
  },
  { maxAge: 60, name: 'public-passes', getKey: (e) => String(getQuery(e).locale ?? 'hu') },
)
