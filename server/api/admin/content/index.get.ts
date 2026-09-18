import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const locale = String(getQuery(event).locale ?? 'hu')

  const items = await prisma.contentBlock.findMany({
    where: { locale },
    orderBy: [{ page: 'asc' }, { group: 'asc' }, { key: 'asc' }],
  })

  // A kulcs szerinti rendezés a párokat rossz sorrendbe tenné (pl. a válasz `.a`
  // a kérdés `.q` elé, a szöveg `.desc` a cím `.title` elé, mert ábécésorrend).
  // A megjelenítéshez: kérdés a válasz előtt, cím a szöveg előtt – a rendező
  // kulcsban a záró szegmenst 1/2-re cseréljük.
  const sortKey = (k: string) =>
    k.replace(/\.q$/, '.1').replace(/\.a$/, '.2').replace(/\.title$/, '.1').replace(/\.desc$/, '.2')
  items.sort((x, y) => {
    if (x.page !== y.page) return x.page < y.page ? -1 : 1
    const gx = x.group ?? '', gy = y.group ?? ''
    if (gx !== gy) return gx < gy ? -1 : 1
    const sx = sortKey(x.key), sy = sortKey(y.key)
    return sx < sy ? -1 : sx > sy ? 1 : 0
  })

  return { items }
})
