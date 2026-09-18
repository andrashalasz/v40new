import { prisma } from './prisma'

/**
 * SMS küldés. Jelenleg Twilio-t támogatunk (a legelterjedtebb, Magyarországon is
 * működő szolgáltató). A beállítások az adminból (ClinicSettings) jönnek:
 * smsProvider = TWILIO, twilioSid, twilioToken, smsFrom (küldő szám vagy
 * alfanumerikus feladónév). Ha nincs konfigurálva, "mock" módban csak naplózunk.
 *
 * Miért Twilio: megbízható, jó kézbesíthetőség, egyszerű REST API, magyar számok
 * is fogadják. Alternatíva lehet a Vonage/Nexmo vagy hazai SMS-átjárók
 * (pl. Seven.io) – ezek később külön adapterként hozzáadhatók.
 */

interface SmsConfig {
  provider: 'TWILIO'
  sid: string
  token: string
  from: string
}

async function resolveConfig(): Promise<SmsConfig | null> {
  const s = await prisma.clinicSettings.findUnique({ where: { id: 1 } }).catch(() => null)
  if (!s || s.smsProvider !== 'TWILIO') return null
  if (!s.twilioSid || !s.twilioToken || !s.smsFrom) return null
  return { provider: 'TWILIO', sid: s.twilioSid, token: s.twilioToken, from: s.smsFrom }
}

export async function smsConfigured(): Promise<boolean> {
  return (await resolveConfig()) !== null
}

export async function sendSms(to: string, body: string): Promise<{ ok: boolean; mock?: boolean; error?: string }> {
  const cfg = await resolveConfig()
  if (!cfg) {
    console.info(`[sms:mock] → ${to} :: ${body.slice(0, 60)}`)
    return { ok: true, mock: true }
  }
  try {
    const form = new URLSearchParams({ To: to, From: cfg.from, Body: body })
    const auth = Buffer.from(`${cfg.sid}:${cfg.token}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    if (!res.ok) {
      const txt = await res.text()
      return { ok: false, error: `Twilio ${res.status}: ${txt.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
