<script setup lang="ts">
/**
 * Admin váz.
 *
 * A korábbi admin oldalak mindegyike a TELJES oldalsávot tartalmazta,
 * bemásolva – hét fájlban ugyanaz a nav. Ezért volt az, hogy egy új menüpont
 * hét helyen kellett, és a kijelölt elem oldalanként elcsúszott.
 * Innentől egy layout hordozza.
 */
const { user, clear } = useUserSession()
const route = useRoute()

const GROUPS = [
  {
    label: 'Katalógus',
    items: [
      { to: '/admin/kezelesek', label: 'Kezelések' },
      { to: '/admin/tipusok', label: 'Kezelés típusok' },
      { to: '/admin/berletek', label: 'Bérletek' },
    ],
  },
  {
    label: 'Erőforrás',
    items: [
      { to: '/admin/szakemberek', label: 'Szakemberek' },
      { to: '/admin/szobak', label: 'Szobák' },
    ],
  },
  {
    label: 'Tartalom',
    items: [
      { to: '/admin/blogok', label: 'Blogok' },
    ],
  },
]

const isOn = (to: string) => route.path === to || route.path.startsWith(to + '/')

async function logout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen bg-[#F4F4F0] text-[#171008] flex">
    <aside class="w-60 shrink-0 bg-white border-r border-[#E4E4DE] sticky top-0 h-screen overflow-y-auto py-5 px-3">
      <NuxtLink to="/admin" class="flex items-center gap-2 px-3 pb-4 font-bold text-[17px]">
        V40 Vital
      </NuxtLink>

      <NuxtLink
        to="/admin"
        class="block rounded-lg px-3 py-2 font-semibold text-sm"
        :class="route.path === '/admin' ? 'bg-[#153131] text-white' : 'text-[#6B6660] hover:bg-[#F4F4F0]'"
      >
        Vezérlőpult
      </NuxtLink>

      <template v-for="g in GROUPS" :key="g.label">
        <p class="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-[#6B6660]">
          {{ g.label }}
        </p>
        <NuxtLink
          v-for="i in g.items"
          :key="i.to"
          :to="i.to"
          class="block rounded-lg px-3 py-2 font-semibold text-sm"
          :class="isOn(i.to) ? 'bg-[#153131] text-white' : 'text-[#6B6660] hover:bg-[#F4F4F0]'"
        >
          {{ i.label }}
        </NuxtLink>
      </template>

      <div class="mt-8 border-t border-[#E4E4DE] pt-4 px-3">
        <p class="text-xs text-[#6B6660] truncate">{{ user?.email }}</p>
        <button class="mt-1 text-xs font-semibold text-[#B3261E]" @click="logout">
          Kilépés
        </button>
      </div>
    </aside>

    <main class="flex-1 min-w-0 px-7 py-6 pb-24">
      <slot />
    </main>
  </div>
</template>
