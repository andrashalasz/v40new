import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const locale = String(getQuery(event).locale ?? 'hu')

  const items = await prisma.contentBlock.findMany({
    where: { locale },
    orderBy: [{ page: 'asc' }, { group: 'asc' }, { key: 'asc' }],
  })
  return { items }
})
