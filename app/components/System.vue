<script setup>
const { t } = await useContent()
// 4 hasáb, feliratuk az alcím négy igéje: Megismerjük · Megértjük · Megtervezzük · Követjük.
const steps = computed(() => [
  { t: t('home.system.step1.title', 'Megismerjük'), d: t('home.system.step1.desc', 'A panaszaidat, céljaidat és egészségi előzményeidet az első konzultáción térképezzük fel.') },
  { t: t('home.system.step2.title', 'Megértjük'), d: t('home.system.step2.desc', 'Laborvizsgálatokkal és diagnosztikai mérésekkel pontos képet kapunk a szervezeted állapotáról.') },
  { t: t('home.system.step3.title', 'Megtervezzük'), d: t('home.system.step3.desc', 'Egyéni longevity programot állítunk össze, és az állapotodhoz igazított kezelésekkel elindítjuk.') },
  { t: t('home.system.step5.title', 'Követjük'), d: t('home.system.step5.desc', 'Az eredményeket rendszeresen nyomon követjük, és szükség esetén módosítjuk a programot.') },
])
</script>

<template>
    <div class="relative w-full lg:px-[100px] pt-20 bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col max-w-[1440px] mx-auto mb-16">
                <h3 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-[#171008]">
                    {{ t('home.system.title', 'Hogyan működik?') }}
                </h3>
                <p class="dm-sans text-[#171008] text-[18px] lg:max-w-[500px]">{{ t('home.system.lead', 'Egy egészségprogram felépülése az első konzultációtól a kontrollig') }}</p>
            </div>
            <div class="w-ful flex flex-col lg:flex-row justify-center items-stretch gap-8 lg:gap-5">
                <div v-for="(s, i) in steps" :key="i"
                    class="relative bg-[#E5F7F9] p-4 lg:p-6 rounded-lg flex flex-col w-full shadow-md lg:w-[24%]">
                    <p class="font-medium text-[#171008] text-[24px] mb-14 leading-[1.3]">{{ s.t }}</p>
                    <div class="w-full bg-[#0000001A] h-[1px] mb-4"></div>
                    <p class="text-[#171008] dm-sans text-[18px]">{{ s.d }}</p>
                    <div class="bg-[#153131] h-9 w-9 rounded-full font-semibold absolute -left-4 -top-4 text-white flex items-center justify-center">{{ i + 1 }}</div>
                </div>
            </div>
            <div class="w-full flex justify-end my-20">
                <NuxtLink
                    class="flex-1 lg:flex-none text-center border-2 border-[#153131] rounded-lg px-8 py-4 dm-sans text-[#153131] font-medium hover:bg-[#F4F4F0]/10 transition-all"
                    to="/gyik">
                    {{ t('home.system.cta', 'Irány a gyakran ismételt kérdések') }}
                </NuxtLink>
            </div>
        </div>
    </div>
</template>
