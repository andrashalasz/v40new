// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  vue: {
    compilerOptions: {
      // Itt mondjuk meg a Vue-nak, hogy ne keressen Swazy nevű Vue fájlt
      isCustomElement: (tag) => tag.startsWith('swazy-')
    }
  },
  app: {
    head: {
      script: [
        { 
          src: 'https://api.swazy.app/swazy-booking.js', 
          defer: true 
        }
      ]
    }
  },

  nitro: {
    port: 3001,
    // Az `externals.include` nem létező opció volt (a típusellenőrzés fogta ki).
    // A Prisma kliens külső modulként kezelése a `external` listával történik –
    // így a query engine binárisa nem kerül bele a bundle-be.
    externals: {
      trace: false,
      external: ['@prisma/client', '.prisma/client'],
    },
  },

  typescript: {
    // A tesztfájl `./availability.ts` alakban importál, mert a node
    // --experimental-strip-types futtatásához a kiterjesztés kötelező.
    tsConfig: {
      compilerOptions: {
        allowImportingTsExtensions: true,
      },
    },
  },

  modules: [
    '@nuxtjs/tailwindcss',
    'nuxt-auth-utils',
    '@nuxt/image',
  ],

})