import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireStaffOrDoctor } from '~~/server/utils/guard'
import { generateDocumentCode, renderOpinionPdf } from '~~/server/utils/opinion'
import { sendMail } from '~~/server/utils/mailer'
import { audit } from '~~/server/utils/audit'

/**
 * Szakvélemény írása egy regisztrált pácienshez. A dokumentum-kód a páciens
 * születési évéből és a dokumentum dátumából áll. A létrejött szakvélemény
 * megjelenik a páciens fiókjában, és e-mailben is kimegy a kódolt PDF-fel.
 */
const body = z.object({
  userId: z.number().int().positive(),
  appointmentId: z.number().int().positive().optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
})

export default defineEventHandler(async (event) => {
  const admin = await requireStaffOrDoctor(event)
  const data = await readValidatedBody(event, body.parse)

  // Orvos csak a hozzárendelt páciensének írhat szakvéleményt.
  if (admin.role === 'DOCTOR') {
    const link = await prisma.patientDoctor.findFirst({ where: { patientId: data.userId, doctorId: admin.id } })
    if (!link) throw createError({ statusCode: 403, statusMessage: 'Ez a páciens nincs hozzád rendelve.' })
  }

  const patient = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, email: true, firstName: true, lastName: true, birthDate: true },
  })
  if (!patient) throw createError({ statusCode: 404, statusMessage: 'A páciens nem található.' })
  if (!patient.birthDate) {
    throw createError({ statusCode: 409, statusMessage: 'A pácienshez nincs születési dátum rögzítve – enélkül nem képezhető dokumentum-kód.' })
  }

  // Ha van kapcsolt kezelés, ellenőrizzük, hogy a pácienshez tartozik.
  let serviceTitle: string | null = null
  if (data.appointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: { id: data.appointmentId, userId: patient.id },
      select: { service: { select: { title: true } } },
    })
    if (!appt) throw createError({ statusCode: 400, statusMessage: 'A megadott kezelés nem ehhez a pácienshez tartozik.' })
    serviceTitle = appt.service.title
  }

  const now = new Date()
  const documentCode = generateDocumentCode(patient.birthDate, now)
  const patientName = [patient.lastName, patient.firstName].filter(Boolean).join(' ') || patient.email
  const authorName = [admin.email].filter(Boolean).join(' ')

  const opinion = await prisma.medicalOpinion.create({
    data: {
      documentCode,
      userId: patient.id,
      authorId: admin.id,
      appointmentId: data.appointmentId ?? null,
      title: data.title,
      body: data.body,
    },
  })

  // PDF előállítása + e-mail a kódolt dokumentummal.
  const pdf = renderOpinionPdf({
    documentCode,
    patientName,
    birthDate: patient.birthDate,
    authorName,
    serviceTitle,
    title: data.title,
    body: data.body,
    createdAt: now,
  })

  const html = `<!doctype html><html lang="hu"><body style="margin:0;background:#F4F4F0;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
      <tr><td style="background:#153131;padding:24px 28px"><span style="color:#fff;font-size:22px;font-weight:700">V40 Vital</span></td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 8px;font-size:22px;color:#171008">Szakvélemény elkészült</h1>
        <p style="margin:0 0 16px;color:#171008;font-size:15px;line-height:1.6">${patientName},<br>elkészült a szakvéleményed. A dokumentumot csatoltuk ehhez az e-mailhez, és a fiókodban is elérhető.</p>
        <table role="presentation" width="100%" style="border-top:1px solid #eee">
          <tr><td style="padding:8px 0;color:#00000080;font-size:14px">Cím</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px">${data.title}</td></tr>
          <tr><td style="padding:8px 0;color:#00000080;font-size:14px">Dokumentum-kód</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px">${documentCode}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 28px;background:#E5F7F9;color:#153131;font-size:12px">V40 Vital · Budapest, Visegrádi utca 40.</td></tr>
    </table></body></html>`
  const text = `Szakvélemény elkészült\n\n${patientName},\nelkészült a szakvéleményed (${data.title}).\nDokumentum-kód: ${documentCode}\nA dokumentumot csatoltuk, és a fiókodban is elérhető.\n\nV40 Vital`

  const mail = await sendMail({
    to: patient.email,
    subject: `Szakvélemény – ${documentCode}`,
    html,
    text,
    attachments: [{ filename: `szakvelemeny-${documentCode}.pdf`, content: pdf, contentType: 'application/pdf' }],
  })

  await prisma.notificationLog.create({
    data: {
      channel: 'EMAIL', template: 'opinion.ready', recipient: patient.email,
      entity: 'MedicalOpinion', entityId: opinion.id,
      sentAt: mail.ok ? new Date() : null, error: mail.ok ? null : (mail.error ?? 'ismeretlen hiba'),
    },
  })
  await audit(event, admin.id, 'opinion.create', 'MedicalOpinion', opinion.id, { patientId: patient.id })

  return { ok: true, id: opinion.id, documentCode, emailSent: mail.ok }
})
