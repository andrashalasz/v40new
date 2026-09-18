/**
 * Aktuális nyelv – sütiben tárolva, hogy SSR-nél is érvényes legyen.
 * A publikus endpointok a `?locale=` query alapján adják a fordított tartalmat
 * (magyar visszaeséssel).
 */
export function useLocale() {
  return useCookie<string>('locale', {
    default: () => 'hu',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
