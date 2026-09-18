<script setup lang="ts">
/** Nyelvváltó a fejlécben. Váltáskor sütit állít és újratölt, hogy minden
 * SSR-tartalom a kért nyelven jöjjön. */
interface Lang {
  code: string
  name: string
  isDefault: boolean
}
// Beépített tartalék: ha az /api/languages nem elérhető (DB-hiba, lassú válasz)
// vagy üres, akkor is legyen nyelvváltó. Így SOHA nem tűnik el az oldalról.
const FALLBACK: Lang[] = [
  { code: 'hu', name: 'Magyar', isDefault: true },
  { code: 'en', name: 'English', isDefault: false },
  { code: 'de', name: 'Deutsch', isDefault: false },
]
const { data: apiLangs } = await useFetch<Lang[]>('/api/languages', { default: () => [] })
const langs = computed(() => (apiLangs.value && apiLangs.value.length ? apiLangs.value : FALLBACK))
const locale = useLocale()
const open = ref(false)

const current = computed(
  () => (langs.value || []).find((l) => l.code === locale.value) ?? { code: locale.value, name: locale.value.toUpperCase() },
)

function pick(code: string) {
  open.value = false
  if (code === locale.value) return
  locale.value = code
  if (import.meta.client) {
    // A useCookie írása aszinkron watcheren megy, a reload viszont azonnal fut,
    // így az újratöltés még a RÉGI sütit olvasná → mindig magyar maradna.
    // Ezért szinkron módon, közvetlenül is kiírjuk a sütit a reload előtt.
    document.cookie = `locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    window.location.reload()
  }
}
</script>

<template>
  <div v-if="(langs || []).length > 1" class="relative">
    <button
      type="button"
      class="flex items-center gap-1.5 rounded-lg border border-[#DBDBDB] px-3 py-1.5 dm-sans text-[14px] text-[#171008] hover:border-[#153131] transition-colors"
      @click="open = !open"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
      {{ current.code.toUpperCase() }}
    </button>
    <div
      v-if="open"
      class="absolute right-0 mt-1.5 min-w-[150px] rounded-lg border border-[#E4E4DE] bg-white py-1 shadow-lg z-50"
    >
      <button
        v-for="l in langs"
        :key="l.code"
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left dm-sans text-[14px] hover:bg-[#F4F4F0]"
        :class="l.code === locale ? 'font-semibold text-[#153131]' : 'text-[#171008]'"
        @click="pick(l.code)"
      >
        <span class="w-6 text-[12px] font-mono text-[#00000080]">{{ l.code.toUpperCase() }}</span>
        {{ l.name }}
      </button>
    </div>
  </div>
</template>
