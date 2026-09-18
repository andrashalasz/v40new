<script setup>
const { t } = await useContent()
</script>

<template>
    <div
        class="relative w-full min-h-[620px] lg:h-[760px] flex flex-col lg:flex-row items-end justify-end lg:justify-between p-4 py-8 lg:px-[96px] lg:py-[64px] overflow-hidden bg-[#153131]">

        <div class="absolute inset-0 bg-cover bg-top"
            :style="{ backgroundImage: `url('/banner1.png')` }">
        </div>

        <div class="absolute inset-0 bg-cover bg-top blur-md scale-105" :style="{
            backgroundImage: `url('/banner1.png')`,
            maskImage: 'linear-gradient(to top, black 0%, transparent 40%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 40%)'
        }">
        </div>

        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#153131]/90"></div>

        <div class="relative z-10 w-full flex flex-col gap-8 lg:gap-12">
            <div class="w-full flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
                <div class="w-full lg:w-auto">
                    <h1
                        class="dm-sans mb-4 font-bold text-[#F4F4F0] text-[32px] lg:text-[64px] lg:max-w-[450px] leading-[1.3] drop-shadow-xl">
                        {{ t('home.hero.title', 'Egészség egy hosszú életre') }}
                    </h1>
                    <p
                        class="dm-sans text-[#F4F4F0] text-[18px] lg:max-w-[490px] leading-[1.3] drop-shadow-md">
                        {{ t('home.hero.lead', 'Orvosi állapotfelmérésre épülő longevity program személyre szabott kezelésekkel és modern diagnosztikával.') }}
                    </p>
                </div>

                <div class="w-full lg:w-auto flex flex-col items-start lg:items-end">
                    <div class="flex items-center gap-4 w-full lg:w-auto">
                        <NuxtLink
                            class="flex-1 lg:flex-none text-center bg-[#F4F4F0] rounded-lg px-8 py-4 dm-sans text-[#153131] font-bold shadow-lg transition-all"
                            to="/idopont">
                            {{ t('home.hero.cta.primary', 'Időpontfoglalás') }}
                        </NuxtLink>
                        <NuxtLink
                            class="flex-1 lg:flex-none text-center border-2 border-[#F4F4F0] rounded-lg px-8 py-0.5 lg:py-4 dm-sans text-[#F4F4F0] font-medium hover:bg-[#F4F4F0]/10 transition-all"
                            to="/longevity">
                            {{ t('home.hero.cta.secondary', 'Mi az a Longevity?') }}
                        </NuxtLink>
                    </div>
                </div>
            </div>

            <!-- Három fő érték – a hero-képre, a szlogen alá -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-8 border-t border-white/25 pt-6 lg:pt-8">
                <div v-for="n in 3" :key="n">
                    <p class="dm-sans font-bold uppercase tracking-[0.08em] text-[#F4F4F0] text-[15px] lg:text-[17px] mb-1.5 drop-shadow">{{ t(`home.why.card${n}.title`, '') }}</p>
                    <p class="dm-sans text-[#F4F4F0]/85 text-[14px] lg:text-[15px] leading-[1.5] drop-shadow">{{ t(`home.why.card${n}.desc`, '') }}</p>
                </div>
            </div>
        </div>
    </div>
</template>