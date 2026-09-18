import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'

/**
 * A páciens saját dokumentumot tölt fel a fiókjában (pl. korábbi lelet). A fájl
 * a public-on KÍVÜLI `storage/patient-docs/` mappába kerül (orvosi adat, nem
 * lehet nyilvánosan elérhető); a letöltés jogosultság-ellenőrzött endpointon át
 * megy. A hozzárendelt orvos és a staff látja.
 */
const ALLOWED: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}
const MAX_BYTES = 15 * 1024 * 1024 // 15 MB

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const form = await readMultipartFormData(event)
  const file = form?.find((p) => p.name === 'file' && p.filename)
  if (!file?.data?.length) throw createError({ statusCode: 400, statusMessage: 'Nincs feltöltött fájl.' })

  const ext = file.type ? ALLOWED[file.type] : undefined
  if (!ext) throw createError({ statusCode: 415, statusMessage: 'Csak PDF vagy kép tölthető fel (PDF, JPG, PNG, WebP, HEIC).' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'A fájl legfeljebb 15 MB lehet.' })

  const note = form?.find((p) => p.name === 'note')?.data?.toString('utf8').slice(0, 2000) || null
  const stored = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`
  const dir = join(process.cwd(), 'storage', 'patient-docs')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, stored), file.data)

  const doc = await prisma.patientDocument.create({
    data: {
      userId: user.id,
      uploadedById: user.id,
      fileName: file.filename ?? stored,
      fileUrl: `storage/patient-docs/${stored}`,
      mimeType: file.type ?? null,
      size: file.data.length,
      note,
    },
    select: { id: true, fileName: true, createdAt: true },
  })
  return { ok: true, document: doc }
})
