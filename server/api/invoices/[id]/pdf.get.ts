import { prisma } from '~~/server/utils/prisma'
import { requireUser } from '~~/server/utils/guard'
import { renderSimplePdf, type PdfLine } from '~~/server/utils/pdf'

/**
 * Számla-bizonylat PDF. Az ügyfél a saját számláját töltheti le, az admin/staff
 * bármelyiket. Ha a szolgáltató adott hivatalos PDF-et (pdfUrl), arra irányítunk;
 * egyébként egyszerű belső bizonylatot generálunk.
 */
const Ft = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { order: { include: { user: true, items: true } } },
  })
  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'A számla nem található.' })

  const isStaff = user.role === 'ADMIN' || user.role === 'STAFF'
  if (!isStaff && invoice.order.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'A számla nem található.' })
  }

  // Hivatalos szolgáltatói PDF, ha van.
  if (invoice.pdfUrl) {
    return sendRedirect(event, invoice.pdfUrl, 302)
  }

  const o = invoice.order
  const buyerName = o.billingName || [o.user.lastName, o.user.firstName].filter(Boolean).join(' ') || o.user.email
  const issued = invoice.issuedAt ?? invoice.createdAt

  const lines: PdfLine[] = [
    { text: 'V40 Vital', size: 22, bold: true },
    { text: invoice.isStorno ? 'Sztornó számla (bizonylat)' : 'Számla (bizonylat)', size: 13, gap: 8 },
    { text: `Számlaszám: ${invoice.invoiceNumber ?? '—'}`, bold: true },
    { text: `Kelt: ${new Intl.DateTimeFormat('hu-HU', { dateStyle: 'long', timeZone: 'Europe/Budapest' }).format(issued)}` },
    { text: `Rendelés: ${o.orderNumber}`, gap: 10 },
    { text: 'Vevő', bold: true },
    { text: buyerName },
    { text: [o.billingZip, o.billingCity].filter(Boolean).join(' ') || '' },
    { text: o.billingAddress || '' },
    { text: o.user.email, gap: 12 },
    { text: 'Tételek', bold: true },
  ]

  for (const it of o.items) {
    lines.push({ text: `${it.titleSnapshot}  ×${it.quantity}   ${Ft(it.unitPriceGross * it.quantity)}` })
    if (it.vatRate === 0) lines.push({ text: '   (adómentes egészségügyi szolgáltatás)', size: 9 })
  }

  lines.push({ text: '', gap: 4 })
  lines.push({ text: `Végösszeg: ${Ft(invoice.totalGross)}`, size: 14, bold: true, gap: 16 })
  lines.push({ text: `NAV Online Számla állapot: ${invoice.navStatus ?? '—'}`, size: 9 })
  lines.push({ text: 'Ez a bizonylat tájékoztató jellegű. A hivatalos e-számlát a számlázó szolgáltató állítja ki.', size: 8 })

  const pdf = renderSimplePdf(lines)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="szamla-${invoice.invoiceNumber ?? invoice.id}.pdf"`)
  return pdf
})
