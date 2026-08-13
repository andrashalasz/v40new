// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  app: {
    head: {
      htmlAttrs: { lang: 'hu' },
    },
  },

  // A port a fejlesztői szerver beállítása, nem Nitro-opció. A korábbi
  // `nitro.port` érvénytelen kulcs volt, tehát valójában soha nem hatott:
  // a dev szerver a 3000-en futott, miközben a README és a Dockerfile 3001-et
  // hirdetett. Ez a fajta eltérés cPanelen órákig kereshető hiba.
  devServer: {
    port: 3001,
  },

  nitro: {
    // Az `externals.include` nem létező opció volt (a típusellenőrzés fogta ki).
    // A Prisma kliens külső modulként kezelése a `external` listával történik –
    // így a query engine binárisa nem kerül bele a bundle-be.
    externals: {
      trace: false,
      external: ['@prisma/client', '.prisma/client'],
    },
  },

  modules: [
    '@nuxtjs/tailwindcss',
    'nuxt-auth-utils',
    '@nuxt/image',
  ],

})