<script setup lang="ts">
/**
 * Időpontfoglalás – kezelésválasztás.
 *
 * A korábbi verzióban itt egy külső Swazy widget volt beágyazva. Azt a saját
 * foglalási folyamat váltotta fel: innen a kezelés kiválasztása után a
 * /foglalas/[slug] oldalra megy az ügyfél, ahol a valódi szabad idősávok
 * jelennek meg az adatbázisból.
 */
interface P {
  id: number
  slug: string
  title: string
  desc: string
  type: string | null
  price: number
  time: number
  vatRate: number
}

const { t } = await useContent()
const locale = useLocale()

// A /api/products/types { value, label } párokat ad vissza: a `value` a stabil
// (magyar) szűrőkulcs, a `label` a kért nyelvű címke. Korábban itt `string[]`
// volt a feltételezett alak, ezért a gombokra a nyers objektum került ki.
const { data: types } = await useFetch<{ value: string, label: string }[]>('/api/products/types', {
  query: { locale },
  watch: [locale],
})

// A szűrés a szerveren történik a magyar kategórianévvel. Kliensoldalon nem
// lehet szűrni, mert idegen nyelven a kezelés `type` mezője már a fordított
// nevet tartalmazza, a szűrőkulcs viszont magyar marad.
const filter = ref('')
const { data: list } = await useFetch<P[]>('/api/products', {
  query: { locale, type: filter },
  watch: [locale, filter],
  default: () => [],
})

const chips = computed(() => [
  { value: '', label: t('common.all', 'Minden') },
  ...(types.value ?? []),
])
const Ft = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'

useSeoMeta({
  title: () => `${t('common.book', 'Időpontfoglalás')} | V40 Vital`,
  description:
    'Válaszd ki a kezelést, és foglalj időpontot online. Szabad időpontok valós időben, azonnali visszaigazolással.',
})
</script>

<template>
  <Header />

  <div class="relative w-full pb-10 pt-12 lg:pt-16 lg:pb-14 lg:px-[100px] bg-[#E5F7F9]">
    <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
      <h1 class="text-[32px] lg:text-[64px] dm-sans font-bold mb-4 text-center text-[#171008]">
        Időpontfoglalás
      </h1>
      <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">
        Válaszd ki a kezelést, és a következő lépésben megjelennek a szabad időpontok.
      </p>
    </div>
  </div>

  <div class="w-full bg-[#F4F4F0] py-10 lg:py-14 lg:px-[100px]">
    <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
      <div class="flex flex-wrap gap-2 mb-7">
        <button
          v-for="c in chips"
          :key="c.value"
          class="rounded-full px-4 py-2 text-[14px] border"
          :class="c.value === filter
            ? 'bg-[#153131] border-[#153131] text-white font-semibold'
            : 'bg-white border-[#0000001A] text-[#00000080]'"
          @click="filter = c.value"
        >
          {{ c.label }}
        </button>
      </div>

      <div v-for="s in list" :key="s.id" class="bg-white rounded-lg p-6 mb-4">
        <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5">
          <div>
            <h2 class="dm-sans font-bold text-[21px] mb-1.5">{{ s.title }}</h2>
            <p class="text-[#00000080] text-[15px] mb-3">{{ s.desc }}</p>
            <div class="flex flex-wrap gap-2">
              <span class="bg-[#2F73F21A] text-[#153131] rounded-sm px-2 py-1 text-[14px]">{{ s.time }} perc</span>
              <span v-if="s.type" class="bg-[#2F73F21A] text-[#153131] rounded-sm px-2 py-1 text-[14px]">{{ s.type }}</span>
            </div>
          </div>
          <div class="lg:text-right shrink-0">
            <p class="dm-sans font-bold text-[28px]">{{ Ft(s.price) }}</p>
            <p class="text-[#00000080] text-[13px] mb-4">
              {{ s.vatRate ? 'bruttó, 27% áfa' : 'áfamentes egészségügyi szolgáltatás' }}
            </p>
            <NuxtLink
              :to="`/foglalas/${s.slug}`"
              class="inline-block bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-4 font-medium dm-sans"
            >
              Időpontot választok
            </NuxtLink>
          </div>
        </div>
      </div>

      <p v-if="!list.length" class="bg-white rounded-lg p-6 text-[#00000080]">
        Ebben a kategóriában jelenleg nincs online foglalható kezelés.
      </p>
    </div>
  </div>

  <WFooter />
</template>
