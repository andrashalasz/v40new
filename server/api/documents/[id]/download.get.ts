import { readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'

/**
 * Páciens-dokumentum letöltése jogosultság-ellenőrzéssel. Hozzáfér: a páciens
 * maga, a staff, és a pácienshez rendelt orvos. A fájl a public-on kívüli
 * storage/patient-docs/ mappából jön; útvonal-kitörés ellen csak a fájlnevet
 * használjuk.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })

  const doc = await prisma.patientDocument.findUnique({ where: { id } })
  if (!doc) throw createError({ statusCode: 404, statusMessage: 'A dokumentum nem található.' })

  const isStaff = user.role === 'ADMIN' || user.role === 'STAFF'
  const isOwner = doc.userId === user.id
  const isAssignedDoctor = user.role === 'DOCTOR'
    ? !!(await prisma.patientDoctor.findFirst({ where: { patientId: doc.userId, doctorId: user.id } }))
    : false
  if (!isStaff && !isOwner && !isAssignedDoctor) {
    throw createError({ statusCode: 404, statusMessage: 'A dokumentum nem található.' })
  }

  const safe = basename(doc.fileUrl) // csak a fájlnév, útvonal-kitörés ellen
  const path = join(process.cwd(), 'storage', 'patient-docs', safe)
  let data: Buffer
  try {
    data = await readFile(path)
  } catch {
    throw createError({ statusCode: 410, statusMessage: 'A fájl már nem elérhető.' })
  }

  setHeader(event, 'Content-Type', doc.mimeType || 'application/octet-stream')
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`)
  return data
})
