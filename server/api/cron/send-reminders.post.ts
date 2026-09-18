import { prisma } from '~~/server/utils/prisma'
import { requireCronSecret } from '~~/server/utils/guard'
import { sendAppointmentEmail, sendAppointmentSms } from '~~/server/utils/notifications'

/**
 * Emlékeztető e-mailek: 1 nappal az időpont előtt ÉS az időpont napjának
 * reggelén. A küldés idempotens (NotificationLog), ezért a cron akármilyen
 * sűrűn futhat – minden sablon foglalásonként egyszer megy ki.
 *
 * cPanel cron, óránként (a reggeli emlékeztetőt a 7 óra utáni első futás küldi):
 *   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" \
 *        https://v40vital.hu/api/cron/send-reminders
 */

/** Egy időpont budapesti napja (YYYY-MM-DD) és órája (0–23). */
function budapestParts(d: Date): { ymd: string; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Budapest',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  )
  return { ymd: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

export default defineEventHandler(async (event) => {
  requireCronSecret(event)

  const now = new Date()
  const horizon = new Date(now.getTime() + 28 * 3_600_000)

  // Megerősített, még el nem kezdődött, nem lemondott foglalások a következő
  // ~28 órában (a másnapi és a mai időpontok is beleférnek).
  const appts = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      cancelledAt: null,
      startsAt: { gt: now, lte: horizon },
    },
    select: { id: true, startsAt: true },
  })

  const settings = await prisma.clinicSettings.findUnique({ where: { id: 1 } })
  const smsOn = settings?.smsRemindersEnabled ?? false

  const today = budapestParts(now)
  let reminded24h = 0
  let remindedMorning = 0
  let smsSent = 0

  for (const a of appts) {
    const hoursUntil = (a.startsAt.getTime() - now.getTime()) / 3_600_000

    // 1 nappal előtte: a 20–28 órás ablakban egyszer (idempotens).
    if (hoursUntil >= 20 && hoursUntil <= 28) {
      const r = await sendAppointmentEmail(a.id, 'booking.reminder24h')
      if (r.sent) reminded24h++
      if (smsOn) {
        const s = await sendAppointmentSms(a.id, 'sms.reminder24h')
        if (s.sent) smsSent++
      }
    }

    // Aznap reggel: ha az időpont a mai budapesti napon van, és már elmúlt 7 óra.
    const apptDay = budapestParts(a.startsAt)
    if (apptDay.ymd === today.ymd && today.hour >= 7) {
      const r = await sendAppointmentEmail(a.id, 'booking.reminder_morning')
      if (r.sent) remindedMorning++
      if (smsOn) {
        const s = await sendAppointmentSms(a.id, 'sms.reminder_morning')
        if (s.sent) smsSent++
      }
    }
  }

  return { ok: true, checked: appts.length, reminded24h, remindedMorning, smsSent }
})
