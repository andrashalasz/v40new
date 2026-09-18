import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * Szöveg-mátrix: kulcsonként az ÖSSZES nyelv értéke egyszerre – a többnyelvű,
 * egymás melletti szerkesztéshez. Nyelvenkénti kitöltöttségi statisztikával.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const langs = await prisma.language.findMany({ orderBy: [{ isDefault: 'desc' }, { code: 'asc' }], select: { code: true, name: true, isDefault: true } })
  const locales = langs.length ? langs.map((l) => l.code) : ['hu']
  const defaultLocale = langs.find((l) => l.isDefault)?.code ?? 'hu'

  const blocks = await prisma.contentBlock.findMany({
    orderBy: [{ page: 'asc' }, { group: 'asc' }, { key: 'asc' }],
    select: { key: true, locale: true, page: true, group: true, label: true, value: true },
  })

  // pivot kulcsonként
  const map = new Map<string, { key: string; page: string; group: string | null; label: string; values: Record<string, string> }>()
  for (const b of blocks) {
    let row = map.get(b.key)
    if (!row) { row = { key: b.key, page: b.page, group: b.group, label: b.label, values: {} }; map.set(b.key, row) }
    row.values[b.locale] = b.value
    // a címkét/oldalt a default nyelv sora adja, ha van
    if (b.locale === defaultLocale) { row.page = b.page; row.group = b.group; row.label = b.label }
  }
  const rows = [...map.values()]

  // statisztika: hány kulcshoz van nem üres érték nyelvenként
  const stats: Record<string, { filled: number; total: number }> = {}
  for (const loc of locales) {
    let filled = 0
    for (const r of rows) if ((r.values[loc] ?? '').trim()) filled++
    stats[loc] = { filled, total: rows.length }
  }

  return { locales, defaultLocale, languages: langs, rows, stats }
})
