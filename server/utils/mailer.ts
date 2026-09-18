import nodemailer, { type Transporter } from 'nodemailer'
import { prisma } from './prisma'

/**
 * E-mail küldés. Az SMTP beállításokat elsődlegesen az adminból (ClinicSettings)
 * olvassuk, ha ott nincs kitöltve, a környezeti változókból (SMTP_HOST stb.).
 * Ha egyik sincs, "mock" módban csak naplózunk, hogy a folyamat kulcsok nélkül
 * is végigtesztelhető legyen. A hívó (NotificationLog) a visszatérésből dönti el,
 * sikerült-e a küldés.
 */

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

async function resolveConfig(): Promise<SmtpConfig | null> {
  const s = await prisma.clinicSettings.findUnique({ where: { id: 1 } }).catch(() => null)

  const host = s?.smtpHost || process.env.SMTP_HOST
  const user = s?.smtpUser || process.env.SMTP_USER
  const pass = s?.smtpPass || process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  return {
    host,
    port: s?.smtpPort || Number(process.env.SMTP_PORT ?? 587),
    user,
    pass,
    from: s?.mailFrom || process.env.MAIL_FROM || 'V40 Vital <info@v40vital.hu>',
  }
}

export interface MailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface MailInput {
  to: string
  subject: string
  html: string
  text: string
  attachments?: MailAttachment[]
}

export async function sendMail(mail: MailInput): Promise<{ ok: boolean; mock?: boolean; error?: string }> {
  const cfg = await resolveConfig()
  if (!cfg) {
    // Nincs SMTP konfig – nem hiba, csak jelezzük, hogy fejlesztésben lássuk.
    const att = mail.attachments?.length ? ` (+${mail.attachments.length} csatolmány)` : ''
    console.info(`[mailer:mock] → ${mail.to} :: ${mail.subject}${att}`)
    return { ok: true, mock: true }
  }
  try {
    const transport: Transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: cfg.user, pass: cfg.pass },
    })
    await transport.sendMail({
      from: cfg.from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: mail.attachments,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
