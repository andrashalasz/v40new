import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'

/**
 * Kiállított számlák listája az adminnak, a NAV-státusszal együtt.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      order: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
    },
  })

  return {
    items: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      provider: inv.provider,
      totalGross: inv.totalGross,
      navStatus: inv.navStatus,
      pdfUrl: inv.pdfUrl,
      isStorno: inv.isStorno,
      issuedAt: inv.issuedAt,
      createdAt: inv.createdAt,
      orderNumber: inv.order.orderNumber,
      customerName: [inv.order.user.lastName, inv.order.user.firstName].filter(Boolean).join(' ') || inv.order.user.email,
    })),
  }
})
