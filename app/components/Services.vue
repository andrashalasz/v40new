<script setup lang="ts">
/**
 * "Kezelés típusok" szekció. A kártyák a /api/categories adatból dolgoznak:
 * a szövegre kattintva felugró ablak nyílik a típus részletes leírásával.
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

const bySlug = computed<Record<string, Category>>(() =>
  Object.fromEntries((categories.value || []).map((c) => [c.slug, c])),
)

const modalOpen = ref(false)
const selected = ref<Category | null>(null)

function openBySlug(slug: string) {
  const c = bySlug.value[slug]
  if (!c) return
  selected.value = c
  modalOpen.value = true
}
</script>

<template>
    <div class="relative w-full pt-20 lg:px-[100px] bg-[#E5F7F9]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col items-center max-w-[1440px] mx-auto mb-16">
                <h2 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    {{ t('home.types.title', 'Kezelés típusok') }}
                </h2>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">{{ t('home.types.lead', 'Programjaink különböző egészségügyi célokra, panaszokra és élethelyzetekre kínálnak megoldást.') }}</p>
            </div>
            <div class="w-ful flex flex-col lg:flex-row justify-center items-stretch gap-4 lg:gap-8">
                <button type="button" @click="openBySlug('infuzios-kezelesek')" class="text-left bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%] hover:shadow-lg transition-shadow">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="50.png" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">{{ t('home.types.infuzio.title', 'Infúziós kezelések') }}</p>
                    <p class="text-[#171008] dm-sans text-[18px]">{{ t('home.types.infuzio.desc', 'Az infúziós vitaminterápia során vitaminok, ásványi anyagok és antioxidánsok közvetlenül a véráramba kerülnek, így gyorsan hasznosulnak. A kezeléseket orvosi felügyelet mellett, személyre szabott állapotfelmérés alapján állítjuk össze.') }}</p>
                    <span class="dm-sans text-[#153131] text-[16px] font-medium mt-4 underline">{{ t('common.more', 'Bővebben') }}</span>
                </button>
                <div class="flex flex-col w-full lg:w-[33%] shadow-md rounded-lg">
                    <NuxtImg class="h-full object-cover shadow-md rounded-lg" src="21.png" />

                </div>
                <button type="button" @click="openBySlug('mikrobiome-programok')" class="text-left bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%] hover:shadow-lg transition-shadow">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="51.png" />
                    <div class="w-full bg-[#00000013] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">{{ t('home.types.mikrobiom.title', 'Mikrobiome programok') }}</p>
                    <p class="text-[#171008] dm-sans text-[18px]">{{ t('home.types.mikrobiom.desc', 'A bélflóra egyensúlya alapvetően befolyásolja az emésztést, az immunrendszert és az anyagcserét. A mikrobiom vizsgálat segít feltérképezni a bélrendszer állapotát, és személyre szabott étrendi javaslatokat ad.') }}</p>
                    <span class="dm-sans text-[#153131] text-[16px] font-medium mt-4 underline">{{ t('common.more', 'Bővebben') }}</span>
                </button>
            </div>
            <div class="w-ful flex flex-col lg:flex-row justify-center items-stretch gap-4 lg:gap-8 mt-8">
                <button type="button" @click="openBySlug('v40-shape')" class="text-left bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%] hover:shadow-lg transition-shadow">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="52.png" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">{{ t('home.types.shape.title', 'V4o SHAPE') }}</p>
                    <p class="text-[#171008] dm-sans text-[18px]">{{ t('home.types.shape.desc', 'A V40 Shape egy modern, orvosi testformáló kezelés, amely elektromágneses és rádiófrekvenciás technológiával aktiválja a mélyizmokat. Segíthet az izomtónus javításában és a testkontúr formálásában, műtét és felépülési idő nélkül.') }}</p>
                    <span class="dm-sans text-[#153131] text-[16px] font-medium mt-4 underline">{{ t('common.more', 'Bővebben') }}</span>
                </button>
                <button type="button" @click="openBySlug('orvosi-testsulycsokkentes')" class="text-left bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%] hover:shadow-lg transition-shadow">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="53.png" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">{{ t('home.types.testsuly.title', 'Orvosi testsúlycsökkentés') }}</p>
                    <p class="text-[#171008] dm-sans text-[18px]">{{ t('home.types.testsuly.desc', 'Az orvosi testsúlycsökkentő program segít biztonságosan csökkenteni a testsúlyt és javítani az anyagcsere-egészséget. A cél a fenntartható fogyás és a szív- és érrendszeri kockázatok csökkentése.') }}</p>
                    <span class="dm-sans text-[#153131] text-[16px] font-medium mt-4 underline">{{ t('common.more', 'Bővebben') }}</span>
                </button>
                <button type="button" @click="openBySlug('anyajegy-vizsgalat')" class="text-left bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%] hover:shadow-lg transition-shadow">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="51.png" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">{{ t('home.types.anyajegy.title', 'Anyajegy vizsgálat') }}</p>
                    <p class="text-[#171008] dm-sans text-[18px]">{{ t('home.types.anyajegy.desc', 'A FotoFinder technológiával végzett digitális anyajegyszűrés teljes testtérképet készít a bőr elváltozásairól. Így a legkisebb változások is időben felismerhetők, ami segíti a bőrrák korai diagnózisát.') }}</p>
                    <span class="dm-sans text-[#153131] text-[16px] font-medium mt-4 underline">{{ t('common.more', 'Bővebben') }}</span>
                </button>
            </div>
            <div class="w-full flex justify-center my-16">
                <NuxtLink
                    class="flex-1 lg:flex-none text-center border-2 border-[#153131] rounded-lg px-8 py-4 dm-sans text-[#153131] font-medium hover:bg-[#F4F4F0]/10 transition-all"
                    to="/kalkulacio">
                    {{ t('home.types.navigatorCta', 'Nem tudom mire van szükségem') }}
                </NuxtLink>
            </div>
            <div class="w-full flex justify-center mt-4 mb-10">
                <div class="relative w-[670px] h-[573px] bg-cover bg-center rounded-2xl shadow-lg"
                    style="background-image: url('26.png');">
                    <div class="hidden lg:absolute lg:-right-40 lg:top-52 bg-white lg:max-w-[330px] rounded-lg p-6 lg:p-8 gap-4 lg:flex flex-col">
                        <p class="text-[#171008] dm-sans font-medium text-[24px]">
                            {{ t('home.types.recommend.title', 'Kinek ajánljuk?') }}
                        </p>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
{{ t('home.types.recommend.1', 'Tudatosan, hosszú távon gondolkodsz az egészségedről') }}
</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
{{ t('home.types.recommend.2', 'Fontos számodra az orvosi minőség és a személyre szabott figyelem') }}
</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
{{ t('home.types.recommend.3', 'Nem gyors megoldást, hanem átgondolt szemléletet keresel') }}
</p>
                        </div>
                    </div>
                    <div class="hidden lg:absolute lg:-left-40 lg:top-52 bg-white lg:max-w-[330px] rounded-lg p-6 lg:p-8 gap-4 lg:flex flex-col">
                        <p class="text-[#171008] dm-sans font-medium text-[24px]">
                            {{ t('home.types.notRecommend.title', 'Kinek nem ajánljuk?') }}
                        </p>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
{{ t('home.types.notRecommend.1', 'Gyors megoldást vársz alapos kivizsgálás nélkül') }}
</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
{{ t('home.types.notRecommend.2', 'Számodra az ár fontosabb, mint a minőség') }}
</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
{{ t('home.types.notRecommend.3', 'Egyetlen kezeléstől vársz teljes változást') }}
</p>
                        </div>
                    </div>
                </div>
        </div>

            <div class="lg:hidden  bg-white rounded-lg p-6 lg:p-8 gap-4 flex flex-col">
                <p class="text-[#171008] dm-sans font-medium text-[24px]">
                    {{ t('home.types.recommend.title', 'Kinek ajánljuk?') }}
                </p>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        {{ t('home.types.recommend.1', 'Tudatosan, hosszú távon gondolkodsz az egészségedről') }}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        {{ t('home.types.recommend.2', 'Fontos számodra az orvosi minőség és a személyre szabott figyelem') }}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        {{ t('home.types.recommend.3', 'Nem gyors megoldást, hanem átgondolt szemléletet keresel') }}
                    </p>
                </div>
            </div>
            <div class="lg:hidden bg-white rounded-lg p-6 lg:p-8 gap-4 mt-6 flex flex-col">
                <p class="text-[#171008] dm-sans font-medium text-[24px]">
{{ t('home.types.notRecommend.title', 'Kinek nem ajánljuk?') }}
</p>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        {{ t('home.types.notRecommend.1', 'Gyors megoldást vársz alapos kivizsgálás nélkül') }}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        {{ t('home.types.notRecommend.2', 'Számodra az ár fontosabb, mint a minőség') }}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        {{ t('home.types.notRecommend.3', 'Egyetlen kezeléstől vársz teljes változást') }}
                    </p>
                </div>
            </div>
            <div class="w-full flex justify-center my-20">
                <NuxtLink
                    class="flex-1 lg:flex-none bg-[#153131] text-center rounded-lg px-8 py-4 dm-sans text-[#F4F4F0] font-medium transition-all"
                    to="/idopont">
{{ t('common.book', 'Időpontfoglalás') }}
</NuxtLink>
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
