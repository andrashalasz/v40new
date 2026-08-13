<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

// A korábbi vezérlőpult a Product és Doctor táblákat számolta – azok megszűntek.
// Most az új modellekből jön a statisztika, az admin CRUD endpointokon.
const [services, practitioners, rooms, passes, blogs] = await Promise.all([
  $fetch<{ items: unknown[] }>('/api/admin/services'),
  $fetch<{ items: unknown[] }>('/api/admin/practitioners'),
  $fetch<{ items: unknown[] }>('/api/admin/rooms'),
  $fetch<{ items: unknown[] }>('/api/admin/passes'),
  $fetch<unknown[]>('/api/blogs').catch(() => []),
])

const cards = [
  { label: 'Kezelések', value: services.items.length, to: '/admin/kezelesek' },
  { label: 'Szakemberek', value: practitioners.items.length, to: '/admin/szakemberek' },
  { label: 'Szobák', value: rooms.items.length, to: '/admin/szobak' },
  { label: 'Bérletek', value: passes.items.length, to: '/admin/berletek' },
  { label: 'Blogbejegyzések', value: Array.isArray(blogs) ? blogs.length : 0, to: '/admin/blogok' },
]

// Amíg a beosztás-felület nincs kész, jelezzük, ha valami hiányzik – enélkül
// néma módon nem lenne foglalható idősáv.
const withoutRoom = computed(
  () => (services.items as { rooms?: unknown[] }[]).filter((s) => !(s.rooms ?? []).length).length,
)
const withoutPractitioner = computed(
  () =>
    (services.items as { practitioners?: unknown[] }[]).filter(
      (s) => !(s.practitioners ?? []).length,
    ).length,
)
</script>

<template>
  <div>
    <h1 class="font-bold text-[22px] mb-0.5">Vezérlőpult</h1>
    <p class="text-[#6B6660] text-sm mb-6">Rendszerállapot és gyorsstatisztika.</p>

    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <NuxtLink
        v-for="c in cards"
        :key="c.label"
        :to="c.to"
        class="rounded-xl border border-[#E4E4DE] bg-white p-4 hover:border-[#153131]"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.07em] text-[#6B6660]">
          {{ c.label }}
        </p>
        <p class="mt-1 text-3xl font-bold">{{ c.value }}</p>
      </NuxtLink>
    </div>

    <div
      v-if="withoutRoom || withoutPractitioner"
      class="mt-5 rounded-xl bg-[#FDF3EA] p-4 text-sm text-[#A6541B]"
    >
      <b>Foglalhatóságot érintő hiányok</b>
      <ul class="mt-1.5 list-disc pl-5">
        <li v-if="withoutPractitioner">
          {{ withoutPractitioner }} kezeléshez nincs szakember rendelve – ezekre nem
          jelenik meg szabad idősáv.
        </li>
        <li v-if="withoutRoom">
          {{ withoutRoom }} kezeléshez nincs szoba rendelve – ezeknél a párhuzamos
          kapacitás nincs korlátozva.
        </li>
      </ul>
    </div>
  </div>
</template>
