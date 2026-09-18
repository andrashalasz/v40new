<script setup lang="ts">
/**
 * A /longevity oldal „Longevity szolgáltatásaink" szekciója: kattintható elemek,
 * amelyek a kategória részletes leírását felugró ablakban nyitják (mint a
 * nyitóoldalon). A tartalom a /api/categories-ből jön, a megjelenített 6 elemet
 * a SLUGS lista és sorrend adja.
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

const { t } = await useContent()
const locale = useLocale()
const { data: categories } = await useFetch<Category[]>('/api/categories', { query: { locale } })

const SLUGS = ['longevity-diagnosztika', 'mikrobiome-programok', 'v40-shape', 'anyajegy-vizsgalat', 'orvosi-testsulycsokkentes', 'menopauza-program']
const items = computed(() => {
  const bySlug = Object.fromEntries((categories.value ?? []).map((c) => [c.slug, c]))
  return SLUGS.map((s) => bySlug[s]).filter((c): c is Category => !!c)
})

const modalOpen = ref(false)
const selected = ref<Category | null>(null)
function open(c: Category) { selected.value = c; modalOpen.value = true }
</script>

<template>
  <section class="mb-14">
    <h3 class="text-[22px] lg:text-[28px] dm-sans font-bold text-[#171008] mb-5">{{ t('longevity.services.title', 'Longevity szolgáltatásaink') }}</h3>
    <ul class="grid sm:grid-cols-2 gap-3">
      <li v-for="c in items" :key="c.slug">
        <button
          type="button"
          class="group w-full flex items-center justify-between gap-3 bg-[#E5F7F9] hover:bg-[#d7f0f3] rounded-xl px-5 py-4 dm-sans text-[17px] font-medium text-[#171008] transition-colors text-left"
          @click="open(c)"
        >
          <span>{{ c.name }}</span>
          <svg viewBox="0 0 24 24" class="h-5 w-5 text-[#153131] shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </li>
    </ul>
  </section>

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
  </AppModal>
</template>
