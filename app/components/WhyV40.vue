<script setup lang="ts">
/**
 * "Miért a V40Vital?" szekció + a kezelés-típusok listája.
 * A lista adminból szerkeszthető kategóriákból épül (/api/categories), és
 * minden elem egy felugró ablakot nyit a típus részletes leírásával.
 */
interface Category {
  slug: string
  name: string
  iconUrl: string | null
  heroImage: string | null
  shortDesc: string | null
  body: string | null
  paragraphs: string[]
}

const locale = useLocale()
const { t } = await useContent()
const { data: categories } = await useFetch<Category[]>('/api/categories', {
  query: { locale: locale.value },
})

const modalOpen = ref(false)
const selected = ref<Category | null>(null)

// A nyitóoldali kockákból kihagyott kategóriák (pl. Konzultáció).
const HIDDEN_SLUGS = new Set(['konzultacio'])
const visibleCategories = computed(() => (categories.value ?? []).filter((c) => !HIDDEN_SLUGS.has(c.slug)))

// Kategóriára jellemző ikonok (feather-stílus, belső SVG markup). A pipa helyett
// ezek jelennek meg. Ismeretlen slugnál az általános orvosi ikon.
const ICON: Record<string, string> = {
  pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  droplet: '<path d="M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  scale: '<path d="M12 3v18M6 7h12"/><path d="M6 7l-3 6a3.5 3.5 0 0 0 6 0zM18 7l-3 6a3.5 3.5 0 0 0 6 0z"/>',
  dna: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  spark: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 22c1.5-3 3-5 5-7"/>',
  cell: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  trend: '<path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
}
const SLUG_ICON: Record<string, string> = {
  'longevity-diagnosztika': 'pulse',
  'mikrobiome-programok': 'cell',
  'infuzios-kezelesek': 'droplet',
  'v40-shape': 'trend',
  'anyajegy-vizsgalat': 'search',
  'orvosi-testsulycsokkentes': 'scale',
  'genetikai-program': 'dna',
  'menopauza-program': 'user',
  'perimenopauza': 'user',
  'intim-hifem': 'spark',
  'ferfi-intim-hifem': 'spark',
  'taplalkozas-longevity': 'leaf',
  'terapias-programok': 'shield',
}
const iconFor = (slug: string) => ICON[SLUG_ICON[slug] ?? ''] ?? ICON.heart

// Alapból 8 kocka látszik (két teljes sor 4 oszlopnál), a többit lefelé nyíllal.
const VISIBLE_COUNT = 8
const expanded = ref(false)
const shownCategories = computed(() => (expanded.value ? visibleCategories.value : visibleCategories.value.slice(0, VISIBLE_COUNT)))
const hasMore = computed(() => visibleCategories.value.length > VISIBLE_COUNT)

function openCategory(c: Category) {
  selected.value = c
  modalOpen.value = true
}
</script>

<template>
    <div class="relative w-full pt-6 pb-16 lg:pb-20 lg:px-[100px] bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col items-center max-w-[1440px] mx-auto mb-10 lg:mb-12">
                <h2 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    {{ t('home.why.title', 'Miért a V40Vital?') }}
                </h2>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">{{ t('home.why.lead', 'Az egészségmegőrzés nálunk nem általános tanácsokból, hanem adatokra épülő orvosi döntésekből indul.') }}</p>
            </div>

            <!-- Kezeléseink – kis kockák -->
            <p class="text-center dm-sans font-semibold text-[#171008] text-[18px] lg:text-[20px] mb-6">{{ t('home.why.treatments', 'Kezeléseink') }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <button
                    v-for="cat in shownCategories"
                    :key="cat.slug"
                    type="button"
                    class="group flex flex-col text-left bg-white rounded-2xl p-6 lg:p-7 shadow-sm hover:shadow-md border border-transparent hover:border-[#153131]/20 transition-all h-full"
                    @click="openCategory(cat)"
                >
                    <span class="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#E5F7F9] text-[#153131] mb-5 shrink-0">
                        <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" v-html="iconFor(cat.slug)" />
                    </span>
                    <span class="text-[#171008] dm-sans text-[18px] lg:text-[20px] font-semibold leading-snug mb-2 group-hover:text-[#153131] transition-colors">
                        {{ cat.name }}
                    </span>
                    <span v-if="cat.shortDesc" class="text-[#00000080] dm-sans text-[14px] leading-[1.5] line-clamp-3">
                        {{ cat.shortDesc }}
                    </span>
                    <span class="mt-4 text-[#153131] dm-sans text-[14px] font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        {{ t('common.more', 'Bővebben') }} →
                    </span>
                </button>
            </div>

            <div v-if="hasMore" class="flex justify-center mt-8">
                <button
                    type="button"
                    class="group inline-flex items-center gap-2 rounded-full bg-white border border-[#153131]/20 px-6 py-3 dm-sans text-[15px] font-semibold text-[#153131] shadow-sm hover:shadow-md transition-all"
                    @click="expanded = !expanded"
                >
                    {{ expanded ? t('home.why.showLess', 'Kevesebb') : t('home.why.showMore', 'Összes kezelés') }}
                    <svg viewBox="0 0 24 24" class="h-5 w-5 transition-transform" :class="expanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>
            </div>
        </div>
    </div>

    <AppModal v-model="modalOpen" :title="selected?.name">
        <NuxtImg
            v-if="selected?.heroImage"
            :src="selected.heroImage"
            :alt="selected?.name"
            class="w-full h-auto rounded-lg mb-5 object-cover max-h-[320px]"
            loading="lazy"
        />
        <p v-if="selected?.shortDesc" class="dm-sans text-[#171008] text-[18px] font-medium mb-4">
            {{ selected.shortDesc }}
        </p>
        <div v-if="selected?.body" class="cat-body" v-html="selected.body" />
        <div v-else class="flex flex-col gap-2.5">
            <p
                v-for="(para, i) in (selected?.paragraphs || [])"
                :key="i"
                :class="para.length < 45 && !/[.:!?…]$/.test(para)
                    ? 'dm-sans text-[#153131] text-[17px] font-semibold mt-2'
                    : 'dm-sans text-[#171008]/90 text-[16px] leading-[1.6]'"
            >
                {{ para }}
            </p>
        </div>
        <NuxtLink
            v-if="selected?.slug === 'mikrobiome-programok'"
            to="/kerdoiv/mikrobiom"
            class="mt-5 inline-block bg-[#E5F7F9] text-[#153131] rounded-lg px-5 py-3 dm-sans font-medium"
            @click="modalOpen = false"
        >
            {{ t('mikrobiom.questionnaireCta', 'Töltse ki a mikrobiom kérdőívet') }}
        </NuxtLink>
        <div class="flex flex-col sm:flex-row gap-3 mt-8">
            <NuxtLink
                to="/idopont"
                class="text-center bg-[#153131] rounded-lg px-6 py-3 dm-sans text-white font-medium"
                @click="modalOpen = false"
            >
                {{ t('common.book', 'Időpontfoglalás') }}
            </NuxtLink>
            <NuxtLink
                to="/kezelesek"
                class="text-center border-2 border-[#153131] rounded-lg px-6 py-3 dm-sans text-[#153131] font-medium"
                @click="modalOpen = false"
            >
                {{ t('common.allTreatments', 'Összes kezelés') }}
            </NuxtLink>
        </div>
    </AppModal>
</template>

<style>
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
    -ms-overflow-style: none;
    /* IE and Edge */
    scrollbar-width: none;
    /* Firefox */
}

.shadow-box {
    box-shadow: 0px 2px 16px 0px #12121214;
}
</style>
