import { prisma } from '~~/server/utils/prisma'

/** Aktív nyelvek a nyelvváltóhoz. */
export default defineEventHandler(async () => {
  const rows = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    select: { code: true, name: true, isDefault: true },
  })
  return rows
})
