import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * Képfeltöltés az admin űrlapokhoz (kezelés, szakember, típus, bérlet).
 *
 * A fájl a public/uploads/ mappába kerül, és a visszaadott URL-t az űrlap a
 * picUrl / iconUrl mezőbe írja. Csak admin hívhatja; a típust és a méretet
 * ellenőrizzük (a fájlnevet mindig mi generáljuk, hogy ne lehessen felülírni
 * meglévő fájlt vagy útvonalat kitörni).
 *
 * Megjegyzés: éles (buildelt) környezetben a public/ nem írható a build után,
 * ezért ott a feltöltéseket deploy-független, kiszolgált könyvtárba érdemes
 * tenni (lásd ROADMAP – üzemeltetés). Fejlesztésben ez így működik.
 */

const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
}

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const form = await readMultipartFormData(event)
  const file = form?.find((p) => p.name === 'file' && p.filename)
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'Nincs feltöltött fájl.' })
  }

  const ext = file.type ? ALLOWED[file.type] : undefined
  if (!ext) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Csak kép tölthető fel (JPG, PNG, WebP, SVG, GIF).',
    })
  }
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'A kép legfeljebb 5 MB lehet.' })
  }

  const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`
  const dir = join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, name), file.data)

  return { url: `/uploads/${name}` }
})
