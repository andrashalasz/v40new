import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * A klinika beállításainak mentése. Csak a felületről szerkeszthető mezők
 * engedélyezettek; minden opcionális, csak a küldötteket írjuk felül.
 */
const body = z.object({
  // Foglalás
  holdMinutes: z.number().int().min(1).max(120).optional(),
  slotGranularityMin: z.number().int().min(5).max(120).optional(),
  defaultMinLeadTimeHours: z.number().int().min(0).max(720).optional(),
  defaultMaxLeadTimeDays: z.number().int().min(1).max(365).optional(),
  freeCancellationHours: z.number().int().min(0).max(720).optional(),
  allowOnlineCancellation: z.boolean().optional(),
  allowOnlineReschedule: z.boolean().optional(),
  // Emlékeztető
  reminderHoursBefore: z.number().int().min(0).max(168).optional(),
  smsRemindersEnabled: z.boolean().optional(),
  // Fizetés / számlázás
  currency: z.enum(['HUF', 'EUR']).optional(),
  onlinePaymentEnabled: z.boolean().optional(),
  cardGuaranteeEnabled: z.boolean().optional(),
  noShowFeePercent: z.number().int().min(0).max(100).optional(),
  invoiceAutoIssue: z.boolean().optional(),
  // E-mail (SMTP)
  smtpHost: z.string().max(200).nullish(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(200).nullish(),
  smtpPass: z.string().max(400).nullish(),
  mailFrom: z.string().max(200).nullish(),
  // SMS
  smsProvider: z.enum(['NONE', 'TWILIO']).optional(),
  smsFrom: z.string().max(40).nullish(),
  twilioSid: z.string().max(80).nullish(),
  twilioToken: z.string().max(120).nullish(),
  // Marketing
  ga4MeasurementId: z.string().max(40).nullish(),
  gtmContainerId: z.string().max(40).nullish(),
  metaPixelId: z.string().max(40).nullish(),
  cookieBannerEnabled: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const data = await readValidatedBody(event, body.parse)

  const settings = await prisma.clinicSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  })

  return { ok: true, settings }
})
