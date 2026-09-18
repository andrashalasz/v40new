<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

interface Blog {
  id: number
  title: string
  slug: string
}

const { data: blogs, refresh, status } = await useFetch<Blog[]>('/api/blogs')
const items = computed(() => blogs.value ?? [])

const deleting = ref<number | null>(null)
const toast = ref('')

async function handleDelete(id: number) {
  if (!confirm('Végleg törlöd ezt a cikket?')) return
  deleting.value = id
  try {
    await $fetch('/api/blogs', { method: 'DELETE', body: { id } })
    await refresh()
    toast.value = 'Törölve'
    setTimeout(() => (toast.value = ''), 2500)
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start gap-4 mb-5">
      <div>
        <h1 class="font-bold text-[24px] tracking-tight">Blogok</h1>
        <p class="text-[#667085] max-w-2xl text-sm mt-0.5">Hírek, cikkek és longevity tippek.</p>
      </div>
      <NuxtLink
        to="/admin/blogok/add"
        class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#153131] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2525] transition-colors"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        Új bejegyzés
      </NuxtLink>
    </div>

    <div class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FAFAFB]">
              <th class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085]">Cím</th>
              <th class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085]">Slug</th>
              <th class="border-b border-[#ECEDEF]" />
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F0F1F3]">
            <tr v-for="blog in items" :key="blog.id" class="hover:bg-[#FAFAFB] transition-colors">
              <td class="py-3 px-4 font-semibold text-[#101828]">{{ blog.title }}</td>
              <td class="py-3 px-4 text-[#475467] font-mono">/{{ blog.slug }}</td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <NuxtLink
                  :to="`/admin/blogok/edit/${blog.id}`"
                  class="rounded-lg border border-[#D9DCE1] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
                >
                  Szerkesztés
                </NuxtLink>
                <button
                  class="ml-1.5 rounded-lg border border-[#FECDCA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B42318] hover:bg-[#FEF3F2] transition-colors disabled:opacity-40"
                  :disabled="deleting === blog.id"
                  @click="handleDelete(blog.id)"
                >
                  {{ deleting === blog.id ? 'Törlés…' : 'Törlés' }}
                </button>
              </td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="3" class="py-10 px-4 text-center text-[#667085]">
                Nincs még blogbejegyzés. Kezdd az „Új bejegyzés" gombbal.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-[#101828] px-5 py-3 text-sm font-semibold text-white shadow-xl">
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
