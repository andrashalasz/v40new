import { z } from 'zod'
import { prisma } from './prisma'

/**
 * Entitás-leírók az admin CRUD-hoz.
 *
 * Ugyanaz a szerkezet, mint az admin prototípusban: egy helyen van a mezőlista,
 * a validálás és a kapcsolatkezelés, és egy generikus kezelő szolgálja ki mind
 * az ötöt. Így egy új mező felvétele egyetlen sor, nem öt fájl módosítása.
 */

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, 'A slug csak kisbetűt, számot és kötőjelet tartalmazhat.')

const vatRate = z.union([z.literal(0), z.literal(27)])
const money = z.number().int().min(0).max(100_000_000)
const ids = z.array(z.number().int().positive()).default([])

export const schemas = {
  service: z.object({
    title: z.string().min(2).max(200),
    slug,
    categoryId: z.number().int().positive().nullable().default(null),
    gender: z.enum(['Mindenki', 'Női', 'Férfi']).default('Mindenki'),
    priceGross: money,
    vatRate,
    durationMin: z.number().int().min(5).max(600),
    bufferBeforeMin: z.number().int().min(0).max(120).default(0),
    bufferAfterMin: z.number().int().min(0).max(120).default(0),
    minLeadTimeHours: z.number().int().min(0).max(24 * 90).default(24),
    maxLeadTimeDays: z.number().int().min(1).max(730).default(90),
    lead: z.string().max(500).nullable().default(null),
    desc: z.string().max(20_000),
    picUrl: z.string().max(500).nullable().default(null),
    isActive: z.boolean().default(true),
    isBookableOnline: z.boolean().default(true),
    metaTitle: z.string().max(200).nullable().default(null),
    metaDescription: z.string().max(400).nullable().default(null),
    sortOrder: z.number().int().default(0),
    roomIds: ids,
    practitionerIds: ids,
  }),

  serviceCategory: z.object({
    name: z.string().min(2).max(200),
    slug,
    shortDesc: z.string().max(2000),
    // A felugró ablak bekezdései. Az üres bekezdéseket kiszűrjük, hogy a
    // frontenden ne jelenjen meg üres <p>.
    longDesc: z
      .array(z.string().max(4000))
      .default([])
      .transform((a) => a.map((s) => s.trim()).filter(Boolean)),
    iconUrl: z.string().max(500).nullable().default(null),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  }),

  practitioner: z.object({
    name: z.string().min(2).max(200),
    slug,
    titles: z.string().max(100).nullable().default(null),
    category: z.string().max(200).nullable().default(null),
    desc: z.string().max(20_000),
    picUrl: z.string().max(500).nullable().default(null),
    isActive: z.boolean().default(true),
    metaTitle: z.string().max(200).nullable().default(null),
    metaDescription: z.string().max(400).nullable().default(null),
    serviceIds: ids,
  }),

  room: z.object({
    name: z.string().min(1).max(120),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  }),

  passTemplate: z.object({
    title: z.string().min(2).max(200),
    slug,
    desc: z.string().max(20_000),
    priceGross: money,
    vatRate,
    sessionCount: z.number().int().min(1).max(500).nullable().default(null),
    validityDays: z.number().int().min(1).max(1825),
    transferable: z.boolean().default(false),
    picUrl: z.string().max(500).nullable().default(null),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
    serviceIds: ids,
  }),
} as const

/** Az áfamentesség indoklása kötelező, ha a kulcs 0 – ez kerül a számlára. */
export const TAM = 'TAM – Áfa tv. 85. § (1) c) egészségügyi szolgáltatás'
export const vatFields = (rate: number) => ({
  vatRate: rate,
  vatExemptReason: rate === 0 ? TAM : null,
})

export interface Resource {
  /** Prisma delegate neve */
  model: 'service' | 'serviceCategory' | 'practitioner' | 'room' | 'passTemplate'
  schema: z.ZodTypeAny
  /** Emberi név a hibaüzenetekhez és az auditba */
  label: string
  include?: Record<string, unknown>
  orderBy?: Record<string, 'asc' | 'desc'>[]
  /** m:n kapcsolatok kezelése a bejövő *Ids tömbökből */
  relations?: (id: number, input: Record<string, never>) => Promise<void>
  /** Hány élő hivatkozás van rá – az archiválás magyarázatához */
  countRefs?: (id: number) => Promise<{ count: number; label: string }>
}

/** m:n kapcsolat átírása: töröljük, ami kikerült, felvesszük, ami bejött. */
async function syncJoin(
  table: 'serviceRoom' | 'servicePractitioner' | 'passTemplateService',
  where: Record<string, number>,
  key: string,
  next: number[],
) {
  const d = prisma[table] as unknown as {
    deleteMany(a: unknown): Promise<unknown>
    createMany(a: unknown): Promise<unknown>
  }
  await d.deleteMany({ where: { ...where, [key]: { notIn: next.length ? next : [0] } } })
  if (next.length) {
    await d.createMany({
      data: next.map((v) => ({ ...where, [key]: v })),
      skipDuplicates: true,
    })
  }
}

export const resources: Record<string, Resource> = {
  services: {
    model: 'service',
    schema: schemas.service,
    label: 'kezelés',
    include: { rooms: true, practitioners: true, category: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    relations: async (id, input) => {
      const i = input as unknown as { roomIds: number[]; practitionerIds: number[] }
      await syncJoin('serviceRoom', { serviceId: id }, 'roomId', i.roomIds ?? [])
      await syncJoin(
        'servicePractitioner',
        { serviceId: id },
        'practitionerId',
        i.practitionerIds ?? [],
      )
    },
    countRefs: async (id) => ({
      count: await prisma.appointment.count({ where: { serviceId: id } }),
      label: 'foglalás hivatkozik rá',
    }),
  },

  categories: {
    model: 'serviceCategory',
    schema: schemas.serviceCategory,
    label: 'kezelés típus',
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    countRefs: async (id) => ({
      count: await prisma.service.count({ where: { categoryId: id } }),
      label: 'kezelés tartozik hozzá',
    }),
  },

  practitioners: {
    model: 'practitioner',
    schema: schemas.practitioner,
    label: 'szakember',
    include: { services: true },
    orderBy: [{ name: 'asc' }],
    relations: async (id, input) => {
      const i = input as unknown as { serviceIds: number[] }
      await syncJoin(
        'servicePractitioner',
        { practitionerId: id },
        'serviceId',
        i.serviceIds ?? [],
      )
    },
    countRefs: async (id) => ({
      count: await prisma.appointment.count({ where: { practitionerId: id } }),
      label: 'foglalás hivatkozik rá',
    }),
  },

  rooms: {
    model: 'room',
    schema: schemas.room,
    label: 'szoba',
    include: { services: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    countRefs: async (id) => ({
      count: await prisma.appointment.count({ where: { roomId: id } }),
      label: 'foglalás hivatkozik rá',
    }),
  },

  passes: {
    model: 'passTemplate',
    schema: schemas.passTemplate,
    label: 'bérlet',
    include: { services: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    relations: async (id, input) => {
      const i = input as unknown as { serviceIds: number[] }
      await syncJoin(
        'passTemplateService',
        { passTemplateId: id },
        'serviceId',
        i.serviceIds ?? [],
      )
    },
    countRefs: async (id) => ({
      count: await prisma.customerPass.count({ where: { passTemplateId: id } }),
      label: 'eladott bérlet hivatkozik rá',
    }),
  },
}

export function resourceOrThrow(name: string): Resource {
  const r = resources[name]
  if (!r) throw createError({ statusCode: 404, statusMessage: 'Ismeretlen erőforrás.' })
  return r
}
