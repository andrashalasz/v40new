/**
 * A nuxt-auth-utils `User` típusának kiegészítése.
 *
 * Enélkül a `session.user.role` és a `user.email` típushibát adott mindenhol,
 * ahol a szerepkört olvassuk – a modul alapból üres `User` interfészt exportál.
 */
declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    role: 'USER' | 'STAFF' | 'ADMIN'
  }
}

export {}
