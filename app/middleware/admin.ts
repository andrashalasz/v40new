export default defineNuxtRouteMiddleware(() => {
  const { user } = useUserSession()

  if (!user.value) return navigateTo('/login')

  // A szerveroldali requireAdmin STAFF-ot is elfogad; a kettő eltérése azt
  // jelentette volna, hogy egy STAFF felhasználó hívhatja az API-t, de a
  // felületre nem tud belépni.
  const role = (user.value as { role?: string }).role
  if (role !== 'ADMIN' && role !== 'STAFF') return navigateTo('/')
})
