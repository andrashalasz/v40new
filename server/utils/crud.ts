import type { H3Event } from 'h3'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { requireAdmin } from './guard'
import { audit } from './audit'
import { resourceOrThrow, vatFields, type Resource } from './resources'

/**
 * Generikus CRUD az admin erőforrásokhoz.
 *
 * Öt entitásra egyetlen implementáció: a különbségeket a resources.ts leíró
 * hordozza. Így nem lehet olyan, hogy az egyik entitásnál elfelejtjük a
 * jogosultság-ellenőrzést vagy az auditálást.
 */

const delegate = (r: Resource) =>
  prisma[r.model] as unknown as {
    findMany(a?: unknown): Promise<Record<string, unknown>[]>
    findUnique(a: unknown): Promise<Record<string, unknown> | null>
    create(a: unknown): Promise<{ id: number }>
    update(a: unknown): Promise<{ id: number }>
    count(a?: unknown): Promise<number>
  }

/** A *Ids mezők nem oszlopok: a kapcsolótáblákba mennek, nem a create/update-be. */
function splitRelationIds(input: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (k.endsWith('Ids')) continue
    data[k] = v
  }
  // Az áfamentesség indoklása a kulcsból következik, nem a kliens adja meg –
  // különben egy 0%-os tétel indoklás nélkül kerülhetne számlára.
  if ('vatRate' in data) Object.assign(data, vatFields(data.vatRate as number))
  return data
}

function humanZodError(e: z.ZodError) {
  return createError({
    statusCode: 422,
    statusMessage: 'Érvénytelen adat.',
    data: {
      fields: Object.fromEntries(
        e.issues.map((i) => [i.path.join('.') || '_', i.message]),
      ),
    },
  })
}

/** Egyedi kulcs ütközése -> 409, a konkrét mező megnevezésével. */
function rethrowPrisma(err: unknown, label: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = (err.meta?.target as string[] | string | undefined) ?? []
    const field = Array.isArray(target) ? target.join(', ') : String(target)
    throw createError({
      statusCode: 409,
      statusMessage: `Ez a ${label} már létezik (${field}).`,
      data: { fields: { [field.includes('slug') ? 'slug' : field]: 'Már használatban van.' } },
    })
  }
  throw err
}

// ---------------------------------------------------------------------------

export async function crudList(event: H3Event) {
  await requireAdmin(event)
  const r = resourceOrThrow(getRouterParam(event, 'resource') ?? '')
  const q = getQuery(event)
  const includeArchived = q.archived === '1' || q.archived === 'true'

  const rows = await delegate(r).findMany({
    where: includeArchived ? {} : { archivedAt: null },
    include: r.include,
    orderBy: r.orderBy,
  })

  return { items: rows }
}

export async function crudCreate(event: H3Event) {
  const admin = await requireAdmin(event)
  const r = resourceOrThrow(getRouterParam(event, 'resource') ?? '')

  const parsed = r.schema.safeParse(await readBody(event))
  if (!parsed.success) throw humanZodError(parsed.error)
  const input = parsed.data as Record<string, unknown>

  let created: { id: number }
  try {
    created = await delegate(r).create({ data: splitRelationIds(input) })
  } catch (e) {
    rethrowPrisma(e, r.label)
  }

  if (r.relations) await r.relations(created.id, input as never)
  await audit(event, admin.id, `${r.model}.create`, r.model, created.id, input)

  const row = await delegate(r).findUnique({
    where: { id: created.id },
    include: r.include,
  })
  return { item: row }
}

export async function crudUpdate(event: H3Event) {
  const admin = await requireAdmin(event)
  const r = resourceOrThrow(getRouterParam(event, 'resource') ?? '')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Hibás azonosító.' })
  }

  const existing = await delegate(r).findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Nem található.' })

  const parsed = r.schema.safeParse(await readBody(event))
  if (!parsed.success) throw humanZodError(parsed.error)
  const input = parsed.data as Record<string, unknown>

  try {
    await delegate(r).update({ where: { id }, data: splitRelationIds(input) })
  } catch (e) {
    rethrowPrisma(e, r.label)
  }

  if (r.relations) await r.relations(id, input as never)
  await audit(event, admin.id, `${r.model}.update`, r.model, id, {
    before: existing,
    after: input,
  })

  const row = await delegate(r).findUnique({ where: { id }, include: r.include })
  return { item: row }
}

/**
 * "Törlés" = archiválás.
 *
 * Amire foglalás vagy számla hivatkozik, azt fizikailag nem lehet törölni: a
 * hivatkozás elszakadna, és az elszámolás visszakövethetetlen lenne. Ezért az
 * archivedAt beállítása történik – a weboldalról eltűnik, az előzmény megmarad.
 */
export async function crudArchive(event: H3Event) {
  const admin = await requireAdmin(event)
  const r = resourceOrThrow(getRouterParam(event, 'resource') ?? '')
  const id = Number(getRouterParam(event, 'id'))

  const existing = await delegate(r).findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Nem található.' })

  const refs = r.countRefs ? await r.countRefs(id) : { count: 0, label: '' }

  await delegate(r).update({
    where: { id },
    data: { archivedAt: new Date(), isActive: false },
  })
  await audit(event, admin.id, `${r.model}.archive`, r.model, id, { refs: refs.count })

  return { ok: true, archived: true, refs }
}

export async function crudRestore(event: H3Event) {
  const admin = await requireAdmin(event)
  const r = resourceOrThrow(getRouterParam(event, 'resource') ?? '')
  const id = Number(getRouterParam(event, 'id'))

  await delegate(r).update({ where: { id }, data: { archivedAt: null, isActive: true } })
  await audit(event, admin.id, `${r.model}.restore`, r.model, id)

  return { ok: true, archived: false }
}
