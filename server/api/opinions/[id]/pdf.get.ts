import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'
import { renderOpinionPdf } from '~~/server/utils/opinion'

/**
 * Szakvélemény PDF letöltése. A páciens a sajátját, a staff bármelyiket.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })

  const o = await prisma.medicalOpinion.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, birthDate: true } },
      author: { select: { firstName: true, lastName: true, email: true } },
      appointment: { select: { service: { select: { title: true } } } },
    },
  })
  if (!o) throw createError({ statusCode: 404, statusMessage: 'A szakvélemény nem található.' })

  const isStaff = user.role === 'ADMIN' || user.role === 'STAFF'
  const isOwner = o.userId === user.id
  const isAuthor = o.authorId === user.id
  // Hozzárendelt orvos is letöltheti a páciense szakvéleményét.
  const isAssignedDoctor = user.role === 'DOCTOR'
    ? !!(await prisma.patientDoctor.findFirst({ where: { patientId: o.userId, doctorId: user.id } }))
    : false
  if (!isStaff && !isOwner && !isAuthor && !isAssignedDoctor) {
    throw createError({ statusCode: 404, statusMessage: 'A szakvélemény nem található.' })
  }

  const pdf = renderOpinionPdf({
    documentCode: o.documentCode,
    patientName: [o.user.lastName, o.user.firstName].filter(Boolean).join(' ') || o.user.email,
    birthDate: o.user.birthDate,
    authorName: o.author ? ([o.author.lastName, o.author.firstName].filter(Boolean).join(' ') || o.author.email) : null,
    serviceTitle: o.appointment?.service.title ?? null,
    title: o.title,
    body: o.body,
    createdAt: o.createdAt,
  })

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="szakvelemeny-${o.documentCode}.pdf"`)
  return pdf
})
