import { prisma } from '~~/server/utils/prisma'
import { getInvoiceProvider, type InvoiceLine, type InvoiceBuyer } from '~~/server/utils/invoicing'
import { getPaymentProvider } from '~~/server/utils/payments'
import { sendOrderEmail } from '~~/server/utils/notifications'

/**
 * Egy online fizetés véglegesítése. Idempotens: ha a Payment már SUCCEEDED,
 * a fizetés-részt kihagyja. A confirm endpoint és a webhook is hívhatja.
 *
 * Lépések sikeres fizetésnél:
 *  1. Payment -> SUCCEEDED, Order -> PAID
 *  2. Foglalás (ha van a rendelésben) -> CONFIRMED
 *  3. Bérlet (ha van a rendelésben) -> ACTIVE
 *  4. Számla kiállítása + NAV-beküldés a szolgáltatón keresztül
 */
export async function finalizePaidCheckout(paymentIntentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId: paymentIntentId },
    include: { order: { include: { items: true } } },
  })
  if (!payment) return null

  if (payment.status !== 'SUCCEEDED') {
    const appointmentId = payment.order.items.find((i) => i.appointmentId)?.appointmentId ?? null

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED', paidAt: new Date() },
      })
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } })

      if (appointmentId) {
        await tx.appointment.update({ where: { id: appointmentId }, data: { status: 'CONFIRMED' } })
      }

      // A rendeléshez kötött, még fizetésre váró bérlet(ek) aktiválása.
      await tx.customerPass.updateMany({
        where: { orderId: payment.orderId, status: 'PENDING_PAYMENT' },
        data: { status: 'ACTIVE' },
      })
    })
  }

  // Számla kiállítása (idempotens), ha az automatikus számlázás be van kapcsolva.
  const settings = await prisma.clinicSettings.findUnique({ where: { id: 1 } })
  if (settings?.invoiceAutoIssue ?? true) {
    await issueInvoiceForOrder(payment.orderId)
  }

  // Vásárlás-visszaigazoló + számla e-mail (idempotens). Nem blokkolja a
  // folyamatot, ha a küldés elhasal.
  try {
    await sendOrderEmail(payment.orderId, 'order.paid')
  } catch {
    // a hiba a NotificationLog-ban nyoma marad; a fizetés érvényes
  }

  return payment
}

/**
 * Számla kiállítása egy kifizetett rendeléshez. Idempotens: ha már van élő
 * (nem sztornó) számla a rendeléshez, nem állít ki újat. A NAV-beküldést a
 * számlázó szolgáltató végzi; a válaszát (számlaszám, navStatus) eltároljuk.
 */
export async function issueInvoiceForOrder(orderId: number) {
  const existing = await prisma.invoice.findFirst({ where: { orderId, isStorno: false } })
  if (existing) return existing

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true, payments: { where: { status: 'SUCCEEDED' }, orderBy: { paidAt: 'desc' } } },
  })
  if (!order) return null

  const paidAt = order.payments[0]?.paidAt ?? new Date()
  const buyerName =
    order.billingName || [order.user.lastName, order.user.firstName].filter(Boolean).join(' ') || order.user.email

  const lines: InvoiceLine[] = order.items.map((i) => ({
    title: i.titleSnapshot,
    quantity: i.quantity,
    unitPriceGross: i.unitPriceGross,
    vatRate: i.vatRate,
    vatExemptReason: i.vatExemptReason ?? (i.vatRate === 0 ? 'Adómentes egészségügyi szolgáltatás' : null),
  }))

  const provider = getInvoiceProvider()

  // Elő-rekord: ha a szolgáltatói hívás elhasal, a szándék akkor is naplózott.
  const draft = await prisma.invoice.create({
    data: { orderId, provider: provider.kind, totalGross: order.totalGross, navStatus: 'PENDING' },
  })

  try {
    const issued = await provider.issue({
      orderNumber: order.orderNumber,
      currency: order.currency,
      buyer: {
        name: buyerName,
        email: order.user.email,
        taxNumber: order.billingTaxNumber,
        country: order.billingCountry ?? 'HU',
        zip: order.billingZip,
        city: order.billingCity,
        address: order.billingAddress,
      },
      lines,
      paidAt,
    })

    return await prisma.invoice.update({
      where: { id: draft.id },
      data: {
        provider: issued.provider,
        providerInvoiceId: issued.providerInvoiceId,
        invoiceNumber: issued.invoiceNumber,
        pdfUrl: issued.pdfUrl,
        navStatus: issued.navStatus,
        issuedAt: new Date(),
      },
    })
  } catch (err) {
    await prisma.invoice.update({
      where: { id: draft.id },
      data: { navStatus: `ERROR: ${err instanceof Error ? err.message : String(err)}`.slice(0, 190) },
    })
    // A fizetés attól még sikeres; a számlát admin újrapróbálhatja.
    return null
  }
}

/**
 * Sztornó (érvénytelenítő) számla kiállítása egy rendelés élő számlájához.
 * Idempotens: ha már van sztornó, nem állít ki újat. A NAV-beküldést a
 * szolgáltató végzi.
 */
export async function stornoInvoiceForOrder(orderId: number) {
  const original = await prisma.invoice.findFirst({ where: { orderId, isStorno: false } })
  if (!original || !original.invoiceNumber) return null

  const already = await prisma.invoice.findFirst({ where: { orderId, isStorno: true } })
  if (already) return already

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, payments: { where: { status: { in: ['SUCCEEDED', 'REFUNDED'] } }, orderBy: { paidAt: 'desc' } } },
  })
  if (!order) return null

  const buyer: InvoiceBuyer = {
    name: order.billingName || [order.user.lastName, order.user.firstName].filter(Boolean).join(' ') || order.user.email,
    email: order.user.email,
    taxNumber: order.billingTaxNumber,
    country: order.billingCountry ?? 'HU',
    zip: order.billingZip,
    city: order.billingCity,
    address: order.billingAddress,
  }

  const provider = getInvoiceProvider()
  try {
    const issued = await provider.storno({
      originalInvoiceNumber: original.invoiceNumber,
      orderNumber: order.orderNumber,
      currency: order.currency,
      buyer,
      paidAt: order.payments[0]?.paidAt ?? new Date(),
    })

    return await prisma.invoice.create({
      data: {
        orderId,
        provider: issued.provider,
        providerInvoiceId: issued.providerInvoiceId,
        invoiceNumber: issued.invoiceNumber,
        isStorno: true,
        stornoOfId: original.id,
        totalGross: -order.totalGross, // érvénytelenítés: negatív végösszeg
        navStatus: issued.navStatus,
        pdfUrl: issued.pdfUrl,
        issuedAt: new Date(),
      },
    })
  } catch (err) {
    await prisma.invoice.create({
      data: {
        orderId,
        provider: provider.kind,
        isStorno: true,
        stornoOfId: original.id,
        totalGross: -order.totalGross,
        navStatus: `ERROR: ${err instanceof Error ? err.message : String(err)}`.slice(0, 190),
      },
    })
    return null
  }
}

/**
 * Egy kifizetett rendelés visszatérítése. A pénz visszautalása a szolgáltatón
 * keresztül, majd Payment -> REFUNDED, Order -> REFUNDED, a rendeléshez kötött
 * bérlet -> REFUNDED, végül sztornó számla. Idempotens: már visszatérített
 * rendelést nem bánt. Visszaadja, sikerült-e a pénzügyi visszatérítés.
 */
export async function refundOrder(orderId: number, reason?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  })
  if (!order) return { ok: false, reason: 'A rendelés nem található.' }

  if (order.status === 'REFUNDED') return { ok: true, alreadyRefunded: true }

  const payment = order.payments.find((p) => p.status === 'SUCCEEDED')
  if (!payment || !payment.providerPaymentId) {
    return { ok: false, reason: 'Ehhez a rendeléshez nincs visszatéríthető fizetés.' }
  }

  const provider = getPaymentProvider()
  const result = await provider.refundPayment({ providerPaymentId: payment.providerPaymentId })
  if (result.status !== 'SUCCEEDED') {
    return { ok: false, reason: result.failReason ?? 'A visszatérítés sikertelen.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', refundedGross: payment.amountGross, failReason: reason ?? null },
    })
    await tx.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } })
    await tx.customerPass.updateMany({
      where: { orderId: order.id, status: { in: ['ACTIVE', 'PENDING_PAYMENT', 'EXHAUSTED'] } },
      data: { status: 'REFUNDED' },
    })
  })

  // Sztornó számla (a NAV felé is érvénytelenítés). Nem blokkolja a folyamatot.
  await stornoInvoiceForOrder(order.id)

  // Visszatérítés-értesítő + sztornó számla e-mail (idempotens).
  try {
    await sendOrderEmail(order.id, 'order.refunded')
  } catch {
    // a hiba a NotificationLog-ban nyoma marad; a visszatérítés érvényes
  }

  return { ok: true, refundedGross: payment.amountGross }
}
