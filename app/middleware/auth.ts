export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()
  // Ügyfél-oldali védelem: a belépés/regisztráció az ügyfél-oldalon történik,
  // NEM az admin belépőn. A visszatérési útvonalat átadjuk.
  if (!loggedIn.value) return navigateTo(`/belepes?redirect=${encodeURIComponent(to.fullPath)}`)
})
