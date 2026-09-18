import { prisma } from './prisma'
import { sendMail } from './mailer'
import { sendSms } from './sms'
import {
  templates,
  orderTemplates,
  type TemplateKey,
  type OrderTemplateKey,
  type ApptEmailData,
  type OrderEmailData,
} from './email-templates'

/**
 * Foglalás-értesítők küldése e-mailben, idempotensen.
 *
 * Minden kiküldést a NotificationLog táblába rögzítünk (template + entityId).
 * Ha egy adott sablon egy adott foglalásra már sikeresen kiment, nem küldjük
 * újra – így az emlékeztető cron akárhányszor lefuthat, egyszer küld.
 */

async function loadAppointment(appointmentId: number): Promise<ApptEmailData | null> {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      publicRef: true,
      startsAt: true,
      settlement: true,
      priceGross: true,
      user: { select: { email: true, firstName: true, lastName: true } },
      service: { select: { title: true, durationMin: true } },
      practitioner: { select: { name: true } },
      room: { select: { name: true } },
    },
  })
}

export interface SendResult {
  sent: boolean
  reason?: 'already-sent' | 'no-recipient' | 'not-found' | 'error'
  error?: string
}

/**
 * Egy foglalás-e-mail kiküldése a megadott sablonnal. Idempotens: ha a
 * (sablon, foglalás) pár már sikeresen kiment, nem küld újra.
 */
export async function sendAppointmentEmail(
  appointmentId: number,
  template: TemplateKey,
): Promise<SendResult> {
  const already = await prisma.notificationLog.findFirst({
    where: { template, entity: 'Appointment', entityId: appointmentId, sentAt: { not: null } },
    select: { id: true },
  })
  if (already) return { sent: false, reason: 'already-sent' }

  const appt = await loadAppointment(appointmentId)
  if (!appt) return { sent: false, reason: 'not-found' }

  const to = appt.user?.email
  if (!to) return { sent: false, reason: 'no-recipient' }

  const { subject, html, text } = templates[template](appt)
  const res = await sendMail({ to, subject, html, text })

  await prisma.notificationLog.create({
    data: {
      channel: 'EMAIL',
      template,
      recipient: to,
      entity: 'Appointment',
      entityId: appointmentId,
      sentAt: res.ok ? new Date() : null,
      error: res.ok ? null : (res.error ?? 'ismeretlen hiba'),
    },
  })

  return res.ok ? { sent: true } : { sent: false, reason: 'error', error: res.error }
}

/**
 * Egy rendelés e-mail kiküldése (vásárlás visszaigazolása / visszatérítés).
 * Idempotens: a (sablon, rendelés) pár csak egyszer megy ki. A számla PDF-linkje
 * a PUBLIC_BASE_URL-re épül, ha be van állítva.
 */
export async function sendOrderEmail(
  orderId: number,
  template: OrderTemplateKey,
): Promise<SendResult> {
  const already = await prisma.notificationLog.findFirst({
    where: { template, entity: 'Order', entityId: orderId, sentAt: { not: null } },
    select: { id: true },
  })
  if (already) return { sent: false, reason: 'already-sent' }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, items: true, invoices: true },
  })
  if (!order) return { sent: false, reason: 'not-found' }

  const to = order.user.email
  if (!to) return { sent: false, reason: 'no-recipient' }

  // A releváns számla: sztornónál a sztornó, egyébként az élő számla.
  const invoice = template === 'order.refunded'
    ? order.invoices.find((i) => i.isStorno)
    : order.invoices.find((i) => !i.isStorno)
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') ?? ''

  const data: OrderEmailData = {
    orderNumber: order.orderNumber,
    customerName:
      order.billingName || [order.user.lastName, order.user.firstName].filter(Boolean).join(' ') || 'Kedves Vásárlónk',
    currency: order.currency,
    totalGross: order.totalGross,
    items: order.items.map((i) => ({ title: i.titleSnapshot, quantity: i.quantity, unitPriceGross: i.unitPriceGross })),
    invoiceNumber: invoice?.invoiceNumber ?? null,
    invoiceUrl: invoice && base ? `${base}/api/invoices/${invoice.id}/pdf` : null,
  }

  const { subject, html, text } = orderTemplates[template](data)
  const res = await sendMail({ to, subject, html, text })

  await prisma.notificationLog.create({
    data: {
      channel: 'EMAIL',
      template,
      recipient: to,
      entity: 'Order',
      entityId: orderId,
      sentAt: res.ok ? new Date() : null,
      error: res.ok ? null : (res.error ?? 'ismeretlen hiba'),
    },
  })

  return res.ok ? { sent: true } : { sent: false, reason: 'error', error: res.error }
}

/**
 * Foglalás-emlékeztető SMS-ben (ha van telefonszám és az SMS be van kapcsolva).
 * Idempotens: a (sablon, foglalás) pár csak egyszer megy ki SMS csatornán.
 */
export async function sendAppointmentSms(
  appointmentId: number,
  template: 'sms.reminder24h' | 'sms.reminder_morning',
): Promise<SendResult> {
  const already = await prisma.notificationLog.findFirst({
    where: { template, channel: 'SMS', entity: 'Appointment', entityId: appointmentId, sentAt: { not: null } },
    select: { id: true },
  })
  if (already) return { sent: false, reason: 'already-sent' }

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      startsAt: true,
      user: { select: { phone: true } },
      service: { select: { title: true } },
    },
  })
  if (!appt) return { sent: false, reason: 'not-found' }
  const to = appt.user?.phone
  if (!to) return { sent: false, reason: 'no-recipient' }

  const time = new Intl.DateTimeFormat('hu-HU', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Budapest',
  }).format(appt.startsAt)
  const body = template === 'sms.reminder_morning'
    ? `V40 Vital emlékeztető: ma ${time} – ${appt.service.title}. Címünk: Budapest, Visegrádi u. 40.`
    : `V40 Vital emlékeztető: holnap ${time} – ${appt.service.title}. Címünk: Budapest, Visegrádi u. 40.`

  const res = await sendSms(to, body)

  await prisma.notificationLog.create({
    data: {
      channel: 'SMS',
      template,
      recipient: to,
      entity: 'Appointment',
      entityId: appointmentId,
      sentAt: res.ok ? new Date() : null,
      error: res.ok ? null : (res.error ?? 'ismeretlen hiba'),
    },
  })

  return res.ok ? { sent: true } : { sent: false, reason: 'error', error: res.error }
}
