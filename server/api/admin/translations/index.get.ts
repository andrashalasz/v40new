import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { entityTranslations, paragraphsFromFields } from '~~/server/utils/i18n'

/**
 * Az adatbázis-tartalom (kezelések, típusok, orvosok, bérletek) fordításai
 * nyelvenként, szerkesztéshez. Minden mezőnél a magyar forrás + a jelenlegi
 * EN/DE érték. A `longDesc` bekezdéseket egyetlen szöveggé fűzzük (üres sorral
 * elválasztva), mert így kényelmesebb szerkeszteni.
 */

const PARA_SEP = '\n\n'

function joinParas(fields: Record<string, string> | undefined, fallback: string[]): string {
  const tr = paragraphsFromFields(fields)
  return (tr ?? fallback).join(PARA_SEP)
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [services, cats, pracs, passes] = await Promise.all([
    prisma.service.findMany({ where: { archivedAt: null }, select: { id: true, title: true, desc: true }, orderBy: { title: 'asc' } }),
    prisma.serviceCategory.findMany({ where: { isActive: true }, select: { id: true, name: true, shortDesc: true, longDesc: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.practitioner.findMany({ where: { archivedAt: null }, select: { id: true, name: true, category: true, desc: true }, orderBy: { name: 'asc' } }),
    prisma.passTemplate.findMany({ where: { archivedAt: null }, select: { id: true, title: true, desc: true }, orderBy: { title: 'asc' } }),
  ])

  const tr = async (entity: string, ids: number[]) => ({
    en: await entityTranslations(entity, ids, 'en'),
    de: await entityTranslations(entity, ids, 'de'),
  })

  const svcTr = await tr('Service', services.map((s) => s.id))
  const catTr = await tr('ServiceCategory', cats.map((c) => c.id))
  const pracTr = await tr('Practitioner', pracs.map((p) => p.id))
  const passTr = await tr('PassTemplate', passes.map((p) => p.id))

  return {
    groups: [
      {
        entity: 'Service',
        label: 'Kezelések',
        fields: [{ key: 'title', label: 'Név', multiline: false }, { key: 'desc', label: 'Leírás', multiline: true }],
        items: services.map((s) => ({
          id: s.id,
          heading: s.title,
          source: { title: s.title, desc: s.desc },
          en: { title: svcTr.en[s.id]?.title ?? '', desc: svcTr.en[s.id]?.desc ?? '' },
          de: { title: svcTr.de[s.id]?.title ?? '', desc: svcTr.de[s.id]?.desc ?? '' },
        })),
      },
      {
        entity: 'ServiceCategory',
        label: 'Kezelés típusok',
        fields: [
          { key: 'name', label: 'Név', multiline: false },
          { key: 'shortDesc', label: 'Rövid leírás', multiline: true },
          { key: 'longDesc', label: 'Részletes (bekezdések üres sorral elválasztva)', multiline: true },
        ],
        items: cats.map((c) => {
          const huParas = Array.isArray(c.longDesc) ? (c.longDesc as string[]) : []
          return {
            id: c.id,
            heading: c.name,
            source: { name: c.name, shortDesc: c.shortDesc ?? '', longDesc: huParas.join(PARA_SEP) },
            en: { name: catTr.en[c.id]?.name ?? '', shortDesc: catTr.en[c.id]?.shortDesc ?? '', longDesc: joinParas(catTr.en[c.id], []) },
            de: { name: catTr.de[c.id]?.name ?? '', shortDesc: catTr.de[c.id]?.shortDesc ?? '', longDesc: joinParas(catTr.de[c.id], []) },
          }
        }),
      },
      {
        entity: 'Practitioner',
        label: 'Szakemberek',
        fields: [{ key: 'category', label: 'Szakterület', multiline: false }, { key: 'desc', label: 'Bemutatkozás', multiline: true }],
        items: pracs.map((p) => ({
          id: p.id,
          heading: p.name,
          source: { category: p.category ?? '', desc: p.desc ?? '' },
          en: { category: pracTr.en[p.id]?.category ?? '', desc: pracTr.en[p.id]?.desc ?? '' },
          de: { category: pracTr.de[p.id]?.category ?? '', desc: pracTr.de[p.id]?.desc ?? '' },
        })),
      },
      {
        entity: 'PassTemplate',
        label: 'Bérletek',
        fields: [{ key: 'title', label: 'Név', multiline: false }, { key: 'desc', label: 'Leírás', multiline: true }],
        items: passes.map((p) => ({
          id: p.id,
          heading: p.title,
          source: { title: p.title, desc: p.desc },
          en: { title: passTr.en[p.id]?.title ?? '', desc: passTr.en[p.id]?.desc ?? '' },
          de: { title: passTr.de[p.id]?.title ?? '', desc: passTr.de[p.id]?.desc ?? '' },
        })),
      },
    ],
  }
})
