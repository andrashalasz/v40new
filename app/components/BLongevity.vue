<script setup>
const { t } = await useContent()
const points = computed(() => [
    t('longevity.body.point1', 'Orvosi állapotfelmérés'),
    t('longevity.body.point2', 'Személyre szabott longevity program'),
    t('longevity.body.point3', 'Diagnosztikára épülő kezelési terv'),
    t('longevity.body.point4', 'Kontroll és hosszú távú követés'),
])
</script>

<template>
    <div class="relative w-full lg:px-[100px] pt-20 pb-20 bg-[#E5F7F9]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col max-w-[1440px] mx-auto mb-16">
                <h2 class="text-[28px] lg:text-[64px] dm-sans font-bold mb-4 text-[#171008]">
                    {{ t('longevity.body.title', 'Minden a longevity programról') }}
                </h2>
                <p class="dm-sans text-[#171008] text-[18px]">
                    {{ t('longevity.body.lead', 'Minden, amit a longevity szemléletről és a program felépítéséről tudni érdemes.') }}
                </p>
            </div>
            <div class="w-full flex flex-col gap-4 lg:gap-8">
                <div class="w-full flex flex-col lg:flex-row lg:justify-between gap-4">
                    <div class="flex flex-col lg:flex-row gap-8">
                        <NuxtImg class="w-[218px] h-[207px] object-cover self-end" src="1.png" />
                        <NuxtImg class="w-[312px] h-[273px] object-cover" src="2.png" />
                    </div>
                    <div class="bg-[#F4F4F0] p-11 rounded-lg flex flex-col w-full shadow-md lg:w-1/2">
                        <p class="text-[24px] lg:text-[36px] dm-sans font-medium mb-4 text-[#171008]">
                            {{ t('longevity.body.card.title', 'Hogyan működik?') }}
                        </p>
                        <p class="dm-sans text-[#171008] text-[18px] whitespace-pre-line">{{ t('longevity.body.card.text', 'A V40Vitalnál a longevity szemlélet azt jelenti, hogy nemcsak a már kialakult problémákat kezeljük, hanem a szervezet működését vizsgáljuk még azelőtt, hogy tünetek jelentkeznének. Programunk átfogó orvosi állapotfelmérésre és személyre szabott kezelési tervre épül. A modern diagnosztika, az infúziós terápiák és az életmód-optimalizáció együtt segítenek abban, hogy a szervezet hosszú távon is egyensúlyban működjön. Célunk nem csupán a betegségek megelőzése, hanem az is, hogy több energiával, jobb koncentrációval és stabil egészséggel élhess a mindennapokban.') }}</p>
                    </div>
                </div>
                <div class="w-full flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                    <div class="flex gap-8">
                        <NuxtImg class="w-[470px] h-[310px] object-cover" src="3.png" />
                    </div>
                    <div class="bg-[#F4F4F0] p-11 rounded-lg flex flex-col w-full shadow-md lg:items-center lg:justify-center lg:max-h-[200px] lg:w-1/2 gap-6">
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                            <div v-for="(p, i) in points" :key="i" class="flex items-center gap-3">
                                <NuxtImg class="h-6" src="4.svg" />
                                <p class="dm-sans text-[18px] text-[#171008]">{{ p }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
