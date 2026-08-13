import type { H3Event } from 'h3'
import { prisma } from './prisma'

/**
 * Auditnapló. Egészségügyi kontextusban és pénzügyi műveletnél nem opcionális:
 * utólag meg kell tudni mondani, ki mit módosított.
 *
 * A naplózás hibája NEM buktathatja el a műveletet, ezért csak logoljuk.
 */
export async function audit(
  event: H3Event,
  userId: number | null,
  action: string,
  entity: string,
  entityId?: number | null,
  meta?: unknown,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        entity,
        entityId: entityId ?? undefined,
        meta: (meta ?? undefined) as never,
        ip: getRequestIP(event, { xForwardedFor: true }) ?? undefined,
      },
    })
  } catch (e) {
    console.error('[audit] nem sikerült naplózni:', action, e)
  }
}
