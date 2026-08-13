<template>
    <div
        class="relative w-full h-[590px] lg:h-[730px] flex flex-col lg:flex-row items-end justify-end lg:justify-between p-4 lg:px-[96px] lg:py-[64px] overflow-hidden bg-[#153131]">

        <div class="absolute inset-0 bg-cover bg-top"
            :style="{ backgroundImage: `url('13.png')` }">
        </div>

        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#153131]/90"></div>

        <div class="relative z-10 w-full flex flex-col lg:flex-row items-end justify-end lg:justify-between">
            <div class="w-full lg:w-auto">
                <h1
                    class="dm-sans mb-4 font-bold text-[#F4F4F0] text-[32px] lg:text-[64px] lg:max-w-[450px] leading-[1.3] drop-shadow-xl">
                    Mi az a Longevity?
                </h1>
                <p
                    class="dm-sans text-[#F4F4F0] text-[18px] lg:max-w-[490px] leading-[1.3] lg:mb-0 drop-shadow-md">
                    A longevity programok, kezelések és a tudatos, hosszú távú egészségmegőrzés szakmai alapjai.
                </p>
            </div>

            <div class="w-full lg:w-auto flex flex-col items-start lg:items-end">
                <div class="flex items-center gap-4 mb-6 mt-4 lg:mt-0 w-full lg:w-auto">
                    <NuxtLink
                        class="flex-1 lg:flex-none text-center bg-[#F4F4F0] rounded-lg px-8 py-4 dm-sans text-[#153131] font-bold shadow-lg transition-all"
                        to="/idopont">
                        Időpontfoglalás
                    </NuxtLink>
                </div>
                <p
                    class="hidden lg:flex dm-sans text-[#F4F4F0] text-[18px] lg:max-w-[490px] text-right leading-[1.4] drop-shadow-md">
                    Orvosi állapotfelmérésre épülő longevity program személyre szabott kezelésekkel és modern
                    diagnosztikával.
                </p>
            </div>
        </div>
    </div>
</template>