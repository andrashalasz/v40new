export default defineNuxtRouteMiddleware((to) => {
  const { user } = useUserSession()
  const role = (user.value as { role?: string } | null)?.role
  const canAdmin = role === 'ADMIN' || role === 'STAFF' || role === 'DOCTOR'

  // A /admin maga a belépőpont: ott a belépő űrlap jelenik meg (nincs külön
  // /login lépés). Az al-oldalakat viszont visszaküldjük a /admin-ra, ha nincs
  // (megfelelő) belépés – így nem próbálnak admin API-t hívni jogosultság nélkül.
  if (!canAdmin && to.path !== '/admin') return navigateTo('/admin')

  // Orvos csak a szakvélemény-felületet éri el; minden mást oda terelünk
  // (a /admin dashboard helyett is a saját munkafelületére visszük).
  if (role === 'DOCTOR' && to.path !== '/admin/szakvelemenyek') return navigateTo('/admin/szakvelemenyek')
})
