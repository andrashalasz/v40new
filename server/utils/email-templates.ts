/**
 * E-mail sablonok (HTML + sima szöveg). A stílus a publikus oldal tokenjeivel:
 * #153131 (sötét), #E5F7F9 (világos), #171008 (szöveg). Minden sablon
 * ugyanazt a foglalás-objektumot kapja.
 */

export interface ApptEmailData {
  publicRef: string
  startsAt: Date
  settlement: string
  priceGross: number
  user: { email: string; firstName: string | null; lastName: string | null } | null
  service: { title: string; durationMin: number }
  practitioner: { name: string }
  room: { name: string } | null
}

const CLINIC_ADDRESS = 'Budapest, Visegrádi utca 40.'

const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Budapest',
  }).format(d)

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Budapest',
  }).format(d)

const fmtFt = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'

const settlementLabel = (s: string) =>
  s === 'PASS' ? 'bérletből' : s === 'ON_SITE' ? 'helyszínen fizetendő' : 'bankkártyás'

const greetingName = (d: ApptEmailData) =>
  [d.user?.lastName, d.user?.firstName].filter(Boolean).join(' ') || 'Kedves Vendégünk'

interface Rendered {
  subject: string
  html: string
  text: string
}

/** Közös elrendezés. `lead` a főszöveg, `intro` a köszöntő alatti mondat. */
function layout(opts: { title: string; intro: string; d: ApptEmailData; footerNote?: string }): string {
  const { d } = opts
  const rows: [string, string][] = [
    ['Kezelés', d.service.title],
    ['Szakember', d.practitioner.name],
    ['Időpont', fmtDateTime(d.startsAt)],
    ['Időtartam', `${d.service.durationMin} perc`],
    ...(d.room ? ([['Helyszín', d.room.name]] as [string, string][]) : []),
    ['Azonosító', d.publicRef],
    ['Fizetés', `${fmtFt(d.priceGross)} · ${settlementLabel(d.settlement)}`],
  ]
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#00000080;font-size:14px">${k}</td>` +
        `<td style="padding:8px 0;text-align:right;font-weight:600;color:#171008;font-size:14px">${v}</td></tr>`,
    )
    .join('')
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#F4F4F0;padding:24px;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#153131;padding:24px 28px"><span style="color:#fff;font-size:22px;font-weight:700">V40 Vital</span></td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 8px;font-size:22px;color:#171008">${opts.title}</h1>
      <p style="margin:0 0 20px;color:#171008;font-size:15px;line-height:1.6">${greetingName(d)},<br>${opts.intro}</p>
      <table role="presentation" width="100%" style="border-top:1px solid #eee">${rowsHtml}</table>
      <p style="margin:20px 0 0;color:#00000080;font-size:13px;line-height:1.6">Rendelő: ${CLINIC_ADDRESS}${
        opts.footerNote ? `<br>${opts.footerNote}` : ''
      }</p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#E5F7F9;color:#153131;font-size:12px">V40 Vital · ${CLINIC_ADDRESS}</td></tr>
  </table></body></html>`
}

function textBlock(title: string, intro: string, d: ApptEmailData): string {
  return (
    `${title}\n\n${greetingName(d)},\n${intro}\n\n` +
    `Kezelés: ${d.service.title}\n` +
    `Szakember: ${d.practitioner.name}\n` +
    `Időpont: ${fmtDateTime(d.startsAt)}\n` +
    `Időtartam: ${d.service.durationMin} perc\n` +
    (d.room ? `Helyszín: ${d.room.name}\n` : '') +
    `Azonosító: ${d.publicRef}\n` +
    `Fizetés: ${fmtFt(d.priceGross)} · ${settlementLabel(d.settlement)}\n\n` +
    `Rendelő: ${CLINIC_ADDRESS}`
  )
}

export function bookingConfirmed(d: ApptEmailData): Rendered {
  const intro = 'köszönjük a foglalásod! Az időpontodat megerősítettük, az adatokat alább találod.'
  return {
    subject: `Foglalás megerősítve – ${d.service.title} (${d.publicRef})`,
    html: layout({
      title: 'Foglalás megerősítve',
      intro,
      d,
      footerNote: 'Ha módosítanál vagy lemondanál, jelentkezz be a fiókodba.',
    }),
    text: textBlock('Foglalás megerősítve', intro, d),
  }
}

export function reminder24h(d: ApptEmailData): Rendered {
  const intro = `emlékeztetünk, hogy holnap, ${fmtTime(d.startsAt)}-kor időpontod van nálunk.`
  return {
    subject: `Emlékeztető: holnap ${fmtTime(d.startsAt)} – ${d.service.title}`,
    html: layout({ title: 'Emlékeztető a holnapi időpontodra', intro, d }),
    text: textBlock('Emlékeztető a holnapi időpontodra', intro, d),
  }
}

export function reminderMorning(d: ApptEmailData): Rendered {
  const intro = `emlékeztetünk, hogy ma, ${fmtTime(d.startsAt)}-kor időpontod van nálunk. Jó, ha 10 perccel korábban érkezel.`
  return {
    subject: `Emlékeztető: ma ${fmtTime(d.startsAt)} – ${d.service.title}`,
    html: layout({ title: 'Emlékeztető a mai időpontodra', intro, d }),
    text: textBlock('Emlékeztető a mai időpontodra', intro, d),
  }
}

export function bookingCancelled(d: ApptEmailData): Rendered {
  const intro = 'a foglalásodat lemondtuk. Ha ez tévedés volt, foglalj új időpontot bármikor.'
  return {
    subject: `Foglalás lemondva – ${d.publicRef}`,
    html: layout({ title: 'Foglalás lemondva', intro, d }),
    text: textBlock('Foglalás lemondva', intro, d),
  }
}

export const templates = {
  'booking.confirmed': bookingConfirmed,
  'booking.reminder24h': reminder24h,
  'booking.reminder_morning': reminderMorning,
  'booking.cancelled': bookingCancelled,
} as const

export type TemplateKey = keyof typeof templates

// ============================ RENDELÉS / SZÁMLA =============================

export interface OrderEmailData {
  orderNumber: string
  customerName: string
  currency: string
  totalGross: number
  items: { title: string; quantity: number; unitPriceGross: number }[]
  invoiceNumber: string | null
  invoiceUrl: string | null // publikus PDF-link, ha van
}

function orderLayout(opts: { title: string; intro: string; d: OrderEmailData; footerNote?: string }): string {
  const { d } = opts
  const itemRows = d.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;color:#171008;font-size:14px">${i.title} ×${i.quantity}</td>` +
        `<td style="padding:8px 0;text-align:right;font-weight:600;color:#171008;font-size:14px">${fmtFt(i.unitPriceGross * i.quantity)}</td></tr>`,
    )
    .join('')
  const invoiceRow = d.invoiceNumber
    ? `<tr><td style="padding:8px 0;color:#00000080;font-size:14px">Számlaszám</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#171008;font-size:14px">${d.invoiceNumber}</td></tr>`
    : ''
  const pdfBtn = d.invoiceUrl
    ? `<p style="margin:18px 0 0"><a href="${d.invoiceUrl}" style="display:inline-block;background:#153131;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px">Számla letöltése</a></p>`
    : ''
  return `<!doctype html><html lang="hu"><body style="margin:0;background:#F4F4F0;padding:24px;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#153131;padding:24px 28px"><span style="color:#fff;font-size:22px;font-weight:700">V40 Vital</span></td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 8px;font-size:22px;color:#171008">${opts.title}</h1>
      <p style="margin:0 0 20px;color:#171008;font-size:15px;line-height:1.6">${d.customerName},<br>${opts.intro}</p>
      <table role="presentation" width="100%" style="border-top:1px solid #eee">${itemRows}
        <tr><td style="padding:10px 0 0;border-top:1px solid #eee;color:#171008;font-size:15px;font-weight:700">Végösszeg</td>
        <td style="padding:10px 0 0;border-top:1px solid #eee;text-align:right;color:#171008;font-size:15px;font-weight:700">${fmtFt(d.totalGross)}</td></tr>
        ${invoiceRow}
      </table>
      ${pdfBtn}
      <p style="margin:18px 0 0;color:#00000080;font-size:13px;line-height:1.6">Rendelésszám: ${d.orderNumber}${
        opts.footerNote ? `<br>${opts.footerNote}` : ''
      }</p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#E5F7F9;color:#153131;font-size:12px">V40 Vital · ${CLINIC_ADDRESS}</td></tr>
  </table></body></html>`
}

function orderText(title: string, intro: string, d: OrderEmailData): string {
  return (
    `${title}\n\n${d.customerName},\n${intro}\n\n` +
    d.items.map((i) => `${i.title} ×${i.quantity}: ${fmtFt(i.unitPriceGross * i.quantity)}`).join('\n') +
    `\nVégösszeg: ${fmtFt(d.totalGross)}\n` +
    (d.invoiceNumber ? `Számlaszám: ${d.invoiceNumber}\n` : '') +
    (d.invoiceUrl ? `Számla: ${d.invoiceUrl}\n` : '') +
    `\nRendelésszám: ${d.orderNumber}\nV40 Vital · ${CLINIC_ADDRESS}`
  )
}

export function orderPaid(d: OrderEmailData): Rendered {
  const intro = 'köszönjük a vásárlásod! A fizetésed sikeres volt, az összesítést és a számlát alább találod.'
  return {
    subject: `Sikeres vásárlás – ${d.orderNumber}`,
    html: orderLayout({ title: 'Sikeres vásárlás', intro, d, footerNote: 'A számlát a NAV Online Számla rendszerébe is beküldtük.' }),
    text: orderText('Sikeres vásárlás', intro, d),
  }
}

export function orderRefunded(d: OrderEmailData): Rendered {
  const intro = 'visszatérítettük a vásárlásod összegét. Az érvénytelenítő (sztornó) számlát alább találod.'
  return {
    subject: `Visszatérítés – ${d.orderNumber}`,
    html: orderLayout({ title: 'Visszatérítés megtörtént', intro, d }),
    text: orderText('Visszatérítés megtörtént', intro, d),
  }
}

export const orderTemplates = {
  'order.paid': orderPaid,
  'order.refunded': orderRefunded,
} as const

export type OrderTemplateKey = keyof typeof orderTemplates
