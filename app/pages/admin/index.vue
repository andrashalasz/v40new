<script setup lang="ts">
// Nincs admin middleware: a /admin maga a belépőpont. Ha nincs bejelentkezve
// (vagy nem staff), az AdminLogin űrlap jelenik meg – nincs külön /login lépés.
definePageMeta({ layout: 'admin' })

const { user } = useUserSession()
const isStaff = computed(() => ['ADMIN', 'STAFF'].includes((user.value as { role?: string })?.role ?? ''))

type Dash = {
  services: { items: { rooms?: unknown[]; practitioners?: unknown[] }[] }
  practitioners: { items: unknown[] }
  rooms: { items: unknown[] }
  passes: { items: unknown[] }
  blogs: unknown[]
}

const { data, refresh } = await useAsyncData<Dash | null>('admin-dashboard', async () => {
  if (!isStaff.value) return null
  const [services, practitioners, rooms, passes, blogs] = await Promise.all([
    $fetch<{ items: { rooms?: unknown[]; practitioners?: unknown[] }[] }>('/api/admin/services'),
    $fetch<{ items: unknown[] }>('/api/admin/practitioners'),
    $fetch<{ items: unknown[] }>('/api/admin/rooms'),
    $fetch<{ items: unknown[] }>('/api/admin/passes'),
    $fetch<unknown[]>('/api/blogs').catch(() => []),
  ])
  return { services, practitioners, rooms, passes, blogs }
})

// Belépés után (a session frissül) töltsük be a vezérlőpultot.
watch(isStaff, (v) => { if (v) refresh() })

const cards = computed(() => {
  const d = data.value
  if (!d) return []
  return [
    { label: 'Kezelések', value: d.services.items.length, to: '/admin/kezelesek', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
    { label: 'Szakemberek', value: d.practitioners.items.length, to: '/admin/szakemberek', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
    { label: 'Szobák', value: d.rooms.items.length, to: '/admin/szobak', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10' },
    { label: 'Bérletek', value: d.passes.items.length, to: '/admin/berletek', icon: 'M2 5h20v14H2zM2 10h20' },
    { label: 'Blogbejegyzések', value: Array.isArray(d.blogs) ? d.blogs.length : 0, to: '/admin/blogok', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6' },
  ]
})

const withoutRoom = computed(() => (data.value?.services.items ?? []).filter((s) => !(s.rooms ?? []).length).length)
const withoutPractitioner = computed(() => (data.value?.services.items ?? []).filter((s) => !(s.practitioners ?? []).length).length)

const quickActions = [
  { label: 'Új kezelés', to: '/admin/kezelesek' },
  { label: 'Új szakember', to: '/admin/szakemberek' },
  { label: 'Új bérlet', to: '/admin/berletek' },
]
</script>

<template>
  <AdminLogin v-if="!isStaff" />
  <div v-else>
    <div class="mb-6">
      <h1 class="font-bold text-[24px] tracking-tight">Vezérlőpult</h1>
      <p class="text-[#667085] text-sm mt-0.5">Áttekintés és gyors műveletek.</p>
    </div>

    <!-- Stat kártyák -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <NuxtLink
        v-for="c in cards"
        :key="c.label"
        :to="c.to"
        class="group rounded-xl border border-[#ECEDEF] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_16px_rgba(16,24,40,0.08)] hover:border-[#D0D5DD] transition-all"
      >
        <div class="flex items-center justify-between">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#E9F3F2] text-[#153131]">
            <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="c.icon" /></svg>
          </span>
          <svg viewBox="0 0 24 24" class="h-4 w-4 text-[#C4C9D1] group-hover:text-[#153131] transition-colors" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </div>
        <p class="mt-3 text-[28px] font-bold leading-none tracking-tight">{{ c.value }}</p>
        <p class="mt-1.5 text-[13px] font-medium text-[#667085]">{{ c.label }}</p>
      </NuxtLink>
    </div>

    <!-- Gyors műveletek -->
    <div class="mt-6 rounded-xl border border-[#ECEDEF] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 class="font-semibold text-[15px] mb-3">Gyors műveletek</h2>
      <div class="flex flex-wrap gap-2.5">
        <NuxtLink
          v-for="a in quickActions"
          :key="a.to"
          :to="a.to"
          class="inline-flex items-center gap-1.5 rounded-lg bg-[#153131] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2525] transition-colors"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          {{ a.label }}
        </NuxtLink>
      </div>
    </div>

    <!-- Figyelmeztetés -->
    <div
      v-if="withoutRoom || withoutPractitioner"
      class="mt-6 rounded-xl border border-[#FEDF89] bg-[#FFFCF5] p-4"
    >
      <div class="flex gap-3">
        <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-[#DC6803]" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" /></svg>
        <div>
          <p class="font-semibold text-[14px] text-[#93370D]">Foglalhatóságot érintő hiányok</p>
          <ul class="mt-1.5 space-y-1 text-[13px] text-[#B54708]">
            <li v-if="withoutPractitioner">
              {{ withoutPractitioner }} kezeléshez nincs szakember rendelve – ezekre nem jelenik meg szabad idősáv.
            </li>
            <li v-if="withoutRoom">
              {{ withoutRoom }} kezeléshez nincs szoba rendelve – ezeknél a párhuzamos kapacitás nincs korlátozva.
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
