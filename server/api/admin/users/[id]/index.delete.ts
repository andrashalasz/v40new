import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/guard'
import { audit } from '~~/server/utils/audit'

/**
 * Páciens (vagy más felhasználó) VÉGLEGES törlése.
 *
 * CSAK akkor engedjük, ha semmi nem kapcsolódik hozzá. Aki bármit csinált a
 * rendszerben, azt nem szabad törölni:
 *
 *  - foglalás, rendelés, számla: számviteli és adójogi megőrzési kötelezettség,
 *  - bérlet: pénzügyi követelést jelenthet,
 *  - szakvélemény, dokumentum: egészségügyi dokumentáció,
 *  - orvos-hozzárendelés: más felhasználó adata is érintett.
 *
 * Ilyenkor a helyes művelet a DEAKTIVÁLÁS (isActive = false), illetve
 * GDPR-törlési kérésnél az anonimizálás – az meghagyja a számlát, de
 * eltávolítja a személyes adatot.
 *
 * A vizsgálatot SZÁNDÉKOSAN a szerver végzi, nem a felület: a gombot elrejteni
 * kényelmi kérdés, a tényleges védelem csak itt lehet.
 */
export default defineEventHandler(async (event) => {
  const me = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Érvénytelen azonosító.' })
  }

  if (id === me.id) {
    throw createError({ statusCode: 400, statusMessage: 'Saját magadat nem törölheted.' })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      _count: {
        select: {
          appointments: true,
          orders: true,
          passes: true,
          medicalOpinions: true,
          authoredOpinions: true,
          documents: true,
          uploadedDocuments: true,
          patientLinks: true,
          doctorLinks: true,
          questionnaires: true,
        },
      },
    },
  })

  if (!user) throw createError({ statusCode: 404, statusMessage: 'A felhasználó nem található.' })

  // Az UTOLSÓ admin nem törölhető: enélkül a rendszer gazdátlanná válna.
  if (user.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } })
    if (admins <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ez az utolsó admin – előbb vegyél fel másikat.',
      })
    }
  }

  const blockers = Object.entries(user._count).filter(([, n]) => n > 0)
  if (blockers.length) {
    const LABEL: Record<string, string> = {
      appointments: 'foglalás',
      orders: 'rendelés',
      passes: 'bérlet',
      medicalOpinions: 'szakvélemény',
      authoredOpinions: 'írt szakvélemény',
      documents: 'dokumentum',
      uploadedDocuments: 'feltöltött dokumentum',
      patientLinks: 'orvos-hozzárendelés',
      doctorLinks: 'páciens-hozzárendelés',
      questionnaires: 'kitöltött kérdőív',
    }
    throw createError({
      statusCode: 409,
      statusMessage:
        'Ez a felhasználó nem törölhető, mert tartozik hozzá: ' +
        blockers.map(([k, n]) => `${n} ${LABEL[k] ?? k}`).join(', ') +
        '. Deaktiváld helyette.',
    })
  }

  // A naplózás a törlés ELŐTT történik: utána már nem lenne mire hivatkozni.
  await audit(event, me.id, 'user.deleted', 'User', id)
  await prisma.user.delete({ where: { id } })

  return { deleted: true, email: user.email }
})
