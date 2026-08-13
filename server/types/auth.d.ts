/**
 * A nuxt-auth-utils `User` típusának kiegészítése.
 *
 * Enélkül a `session.user.role` és a `user.email` olvasása típushibát ad, mert
 * a modul alapból üres `User` interfészt exportál.
 *
 * A fájl SZÁNDÉKOSAN két helyen szerepel: a Nuxt külön TypeScript projektet
 * generál az app és a server könyvtárnak, és egy gyökérben lévő .d.ts egyik
 * projektbe sem kerül be. Ha a tartalma változik, mindkettőt módosítani kell.
 */
declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    role: 'USER' | 'STAFF' | 'ADMIN'
  }
}

export {}
