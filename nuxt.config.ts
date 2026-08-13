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
    externals: {
      trace: false,
      include: ['@prisma/client']
    }
  },

  modules: [
    '@nuxtjs/tailwindcss',
    'nuxt-auth-utils',
    '@nuxt/image',
  ],

})