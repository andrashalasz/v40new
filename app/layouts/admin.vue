<script setup lang="ts">
/**
 * Admin app-shell: ikonos oldalsáv + felső sáv. Egy layout hordozza a navigációt
 * (korábban minden oldal bemásolta), így egy menüpont egy helyen van.
 */
const { user, clear } = useUserSession()
const route = useRoute()

// Ki láthatja az app-shellt: staff és orvos. Kijelentkezve a /admin a belépő
// űrlapot rendereli a slotban.
const role = computed(() => (user.value as { role?: string })?.role ?? '')
const isStaff = computed(() => ['ADMIN', 'STAFF', 'DOCTOR'].includes(role.value))
const isDoctor = computed(() => role.value === 'DOCTOR')
// Orvosnak csak a szakvélemény-menüpont látszik.
const visibleGroups = computed(() =>
  isDoctor.value
    ? [{ label: 'Munka', items: [{ to: '/admin/szakvelemenyek', label: 'Szakvélemények', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' }] }]
    : GROUPS,
)

interface NavItem {
  to: string
  label: string
  icon: string
}

const DASHBOARD: NavItem = { to: '/admin', label: 'Vezérlőpult', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' }

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Katalógus',
    items: [
      { to: '/admin/kezelesek', label: 'Kezelések', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
      { to: '/admin/tipusok', label: 'Kezelés típusok', icon: 'M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01' },
      { to: '/admin/berletek', label: 'Bérletek', icon: 'M2 5h20v14H2zM2 10h20' },
    ],
  },
  {
    label: 'Erőforrás',
    items: [
      { to: '/admin/szakemberek', label: 'Szakemberek', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
      { to: '/admin/szobak', label: 'Szobák', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10' },
    ],
  },
  {
    label: 'Ügyfelek',
    items: [
      { to: '/admin/felhasznalok', label: 'Felhasználók', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
      { to: '/admin/foglalasok', label: 'Foglalások', icon: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z' },
      { to: '/admin/eladott-berletek', label: 'Eladott bérletek', icon: 'M2 5h20v14H2zM2 10h20M6 15h4' },
      { to: '/admin/szamlak', label: 'Számlák', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6' },
      { to: '/admin/ugyfelek', label: 'Ügyfelek', icon: 'M17 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 1 3-3.87M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
      { to: '/admin/szakvelemenyek', label: 'Szakvélemények', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
    ],
  },
  {
    label: 'Tartalom',
    items: [
      { to: '/admin/tartalom', label: 'Szövegek & fordítások', icon: 'M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M9 20h6M12 4v16' },
      { to: '/admin/blogok', label: 'Blogok', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
      { to: '/admin/nyelvek', label: 'Nyelvek', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20' },
    ],
  },
  {
    label: 'Rendszer',
    items: [
      { to: '/admin/beallitasok', label: 'Beállítások', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
    ],
  },
]

const isOn = (to: string) =>
  to === '/admin' ? route.path === '/admin' : route.path === to || route.path.startsWith(to + '/')

const currentLabel = computed(() => {
  const all = [DASHBOARD, ...GROUPS.flatMap((g) => g.items)]
  return all.find((i) => isOn(i.to))?.label ?? 'Admin'
})

const initial = computed(() => (user.value?.email?.[0] ?? 'A').toUpperCase())

async function logout() {
  await clear()
  await navigateTo('/admin')
}
</script>

<template>
  <!-- Nincs bejelentkezve: csak a belépő (slot), app-shell nélkül. -->
  <div v-if="!isStaff">
    <slot />
  </div>

  <div v-else class="min-h-screen bg-[#F6F7F9] text-[#101828] flex">
    <!-- Oldalsáv -->
    <aside class="w-64 shrink-0 bg-white border-r border-[#ECEDEF] sticky top-0 h-screen hidden md:flex flex-col">
      <div class="px-5 h-16 flex items-center border-b border-[#ECEDEF]">
        <NuxtLink to="/admin" class="flex items-center gap-2 font-bold text-[17px] tracking-tight">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#153131] text-white text-[13px]">V4</span>
          V40 Vital
        </NuxtLink>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4">
        <NuxtLink v-if="!isDoctor" :to="DASHBOARD.to" class="nav-item" :class="isOn(DASHBOARD.to) ? 'nav-on' : 'nav-off'">
          <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="DASHBOARD.icon" /></svg>
          {{ DASHBOARD.label }}
        </NuxtLink>

        <template v-for="g in visibleGroups" :key="g.label">
          <p class="px-3 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98A2B3]">{{ g.label }}</p>
          <NuxtLink
            v-for="i in g.items"
            :key="i.to"
            :to="i.to"
            class="nav-item"
            :class="isOn(i.to) ? 'nav-on' : 'nav-off'"
          >
            <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="i.icon" /></svg>
            {{ i.label }}
          </NuxtLink>
        </template>
      </nav>

      <div class="border-t border-[#ECEDEF] p-3">
        <div class="flex items-center gap-3 rounded-lg px-2 py-2">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#E9F3F2] text-[#153131] font-bold text-sm">{{ initial }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-semibold">{{ user?.email }}</p>
            <p class="text-[11px] text-[#98A2B3]">Adminisztrátor</p>
          </div>
          <button class="text-[#98A2B3] hover:text-[#B42318] transition-colors" title="Kilépés" @click="logout">
            <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Fő terület -->
    <div class="flex-1 min-w-0 flex flex-col">
      <header class="sticky top-0 z-30 h-16 flex items-center gap-3 border-b border-[#ECEDEF] bg-white/80 backdrop-blur px-5 lg:px-8">
        <h2 class="font-semibold text-[15px] tracking-tight">{{ currentLabel }}</h2>
        <a
          href="/"
          target="_blank"
          class="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#D9DCE1] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></svg>
          Weboldal
        </a>
      </header>

      <main class="flex-1 min-w-0 px-5 lg:px-8 py-6 pb-24">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.15s, color 0.15s;
}
.nav-on {
  background: #153131;
  color: #fff;
}
.nav-off {
  color: #5b6470;
}
.nav-off:hover {
  background: #f1f2f4;
  color: #101828;
}
</style>
