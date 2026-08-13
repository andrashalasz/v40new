export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  // A visszatérési útvonalat átadjuk, hogy belépés után ide jöjjön vissza.
  if (!loggedIn.value) return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
})
