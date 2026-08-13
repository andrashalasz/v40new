<script setup>
// Kategóriák lekérése
const { data: types } = await useFetch('/api/products/types')

const selectedType = ref(null)

const allCategories = computed(() => {
  return types.value || []
})

// Termékek lekérése
const { data: rawProducts, pending } = await useFetch('/api/products', {
  params: { type: selectedType },
  watch: [selectedType]
})

// Fix sorrendek a képernyőfotók alapján
const orderReference = {
  "Infúziós kezelés": [
    "NAD+ sejtszintű regeneráló infúzió",
    "Prémium vitamin- és ásványianyag infúzió",
    "Immunerősítő infúzió",
    "Bőrmegújító és ragyogást támogató infúzió",
    "Posztmenopauzális vitalitástámogató infúzió",
    "Női hormonális egyensúlyt támogató infúzió",
    "Teljesítményfokozó sportinfúzió",
    "Gyors regenerációt támogató infúzió",
    "Keringést és terhelhetőséget támogató infúzió",
    "Májregenerációs és méregtelenítő infúzió",
    "Prémium vitalitástámogató infúzió"
  ],
  "Mikrobiome program": [
    "Bélrendszeri egyensúlyt támogató mikrobiom program",
    "Szív–bél egyensúlyt támogató mikrobiom program",
    "Sportolói teljesítményt támogató mikrobiom program"
  ]
}

// Rendezett termékek listája
const products = computed(() => {
  if (!rawProducts.value) return []

  const currentOrder = orderReference[selectedType.value]

  if (!currentOrder) return rawProducts.value

  // Lemásoljuk a tömböt és sorba rendezzük a referencia lista alapján
  return [...rawProducts.value].sort((a, b) => {
    const indexA = currentOrder.indexOf(a.title)
    const indexB = currentOrder.indexOf(b.title)

    // Ha valamelyik nincs a listában, a végére kerül
    if (indexA === -1) return 1
    if (indexB === -1) return -1

    return indexA - indexB
  })
})

const slugify = (text) => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}
</script>

<template>
  <div class="relative w-full lg:px-[100px] pt-20 pb-20 bg-[#F4F4F0]">
    <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
      <div class="flex justify-center mb-12">
        <div class="flex items-center gap-8 overflow-x-auto no-scrollbar border-b border-gray-200 pb-[1px] w-fit">
          <button v-for="category in allCategories" :key="category" @click="selectedType = category"
            class="pb-3 text-sm lg:text-[18px] font-semibold transition-all duration-300 relative whitespace-nowrap px-2"
            :class="[selectedType === category ? 'text-[#153131]' : 'text-[#767676] hover:text-[#070707]']">
            {{ category }}
            <div class="absolute -bottom-0.5 left-0 w-full h-[3px] transition-all duration-300 rounded-full"
              :class="selectedType === category ? 'bg-[#153131] scale-x-100' : 'bg-transparent scale-x-0'"></div>
          </button>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-14 lg:gap-6">
        <NuxtLink v-for="product in products" :key="product.id" :to="`/szolgaltatas/${slugify(product.title)}`"
          class="w-full flex flex-col lg:flex-row justify-between border-b border-[#DBDBDB]">
          <div class="flex flex-col lg:flex-row items-center gap-6">
            <NuxtImg :src="product.picUrl" :alt="product.title" class="w-full lg:h-[280px] lg:w-[280px] object-cover flex-shrink-0 rounded-xl lg:mb-4" />
            <div class="w-full">
              <h3 class="font-medium text-[24px] text-[#171008] dm-sans mb-2">{{ product.title }}</h3>
              <p class="text-[#171008] text-[16px] dm-sans mb-4 line-clamp-2">{{ product.desc.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim() }}</p>
              <div class="flex items-center gap-3 lg:mt-10 mb-4 lg:mb-0">
                <div class="bg-[#2F73F21A] rounded-sm text-[#153131] text-[16px] dm-sans px-2 py-1">{{ product.time }} perc</div>
                <div class="bg-[#2F73F21A] rounded-sm text-[#153131] text-[16px] dm-sans px-2 py-1">{{ product.type }}</div>
              </div>
            </div>
          </div>
          <div class="flex flex-col justify-center">
            <p class="text-[24px] text-[#171008] dm-sans font-medium mb-8 lg:mb-14">{{ new Intl.NumberFormat('hu-HU').format(product.price) }} Ft</p>
            <NuxtLink
              class="flex-1 lg:flex-none text-center border-2 border-[#153131] rounded-lg px-8 py-4 dm-sans text-[#153131] font-medium hover:bg-[#F4F4F0]/10 transition-all"
              :to="`/szolgaltatas/${slugify(product.title)}`">
              Bővebben
            </NuxtLink>
          </div>
        </NuxtLink>
      </div>
      <div class="w-full flex flex-col lg:flex-row mt-20 lg:mt-40 lg: gap-10">
        <NuxtImg class="w-full lg:w-[400px] lg:h-[400px] rounded-lg" src="19.png" />
        <div class="flex flex-col">
          <p
            class="dm-sans mb-4 font-bold text-[#171008] text-[32px] lg:text-[64px] leading-[1.3] drop-shadow-xl">
            Nem tudod melyik kell?
        </p>
          <p class="dm-sans text-[#171008] text-[18px] lg:max-w-[490px] leading-[1.3] drop-shadow-md">
            Prémium állapotfelmérésre építünk, és személyre szabott kezelésekkel támogatjuk a céljaidat
          </p>
          <div class="w-full lg:w-auto flex flex-col mt-8 lg:mt-28">
            <div class="flex flex-col lg:flex-row items-center gap-4 mb-6 w-full lg:w-auto">
              <NuxtLink
                class="flex-1 lg:flex-none text-center bg-[#153131] rounded-lg px-8 py-4 dm-sans text-[white] transition-all"
                to="/idopont">
                Időpontfoglalás
              </NuxtLink>
              <NuxtLink
                class="flex-1 lg:flex-none text-center border-2 border-[#153131] rounded-lg px-8 py-4 dm-sans text-[#153131] transition-all"
                to="/longevity">
                Mi az a Longevity?
              </NuxtLink>
            </div>
            <p class="flex dm-sans text-[#171008] text-[18px] lg:max-w-[480px] leading-[1.4] drop-shadow-md">
              Prémium állapot felmérésre építünk, és személyre szabott kezelésekkel támogatjuk a céljaidat
            </p>
          </div>
        </div>
        
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>