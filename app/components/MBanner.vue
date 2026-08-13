<template>
    <div
        class="relative w-full h-[760px] lg:h-[680px] flex flex-col lg:flex-row items-end justify-end lg:justify-between p-4 lg:px-[96px] lg:py-[64px] overflow-hidden bg-[#153131]">

        <div class="absolute inset-0 bg-cover bg-top"
            :style="{ backgroundImage: `url('14.png')` }">
        </div>

        <div
            class="absolute inset-0 bg-gradient-to-b from-transparent via-[#153131]/60 lg:via-transparent to-[#153131] via-30% lg:via-100%">
        </div>

        <div class="relative z-10 w-full flex flex-col lg:flex-row items-end justify-end lg:justify-between">
            <div class="w-full lg:w-auto">
                <h1
                    class="dm-sans mb-4 font-bold text-[#F4F4F0] text-[32px] lg:text-[64px] lg:max-w-[500px] leading-[1.3] drop-shadow-xl">
                    Foglalj időpontot kedvezménnyel!
                </h1>
                <p
                    class="dm-sans text-[#F4F4F0] text-[18px] lg:max-w-[490px] leading-[1.3] mb-10 drop-shadow-md">
                    Prémium állapotfelmérésre építünk, és személyre szabott kezelésekkel támogatjuk a céljaidat
                </p>
                <div class="py-8 flex items-center gap-4 border-b border-white">
                    <NuxtImg class=" h-7 hidden lg:flex lg:h-12" src="15.svg" />
                    <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                            <p class="dm-sans font-medium text-white text-[20px]">Hétfő - Péntek: 7:00 - 19:00</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <p class="dm-sans font-medium text-white text-[20px]">Szombat: 8:00 - 12:00</p>
                        </div>
                    </div>
                </div>
                <div class="py-8 flex items-center gap-4 border-b border-white">
                    <NuxtImg class="h-7 hidden lg:flex lg:h-12" src="16.svg" />
                    <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                            <a href="tel:+36204592248"
                                class="dm-sans font-medium text-white text-[20px] hover:text-gray-300 transition-colors">
                                Telefon: +36 20 459 2248
                            </a>
                        </div>

                        <div class="flex items-center gap-2">
                            <p class="dm-sans font-medium text-white text-[20px]">Email:</p>
                            <a href="mailto:info@v40vital.hu"
                                class="dm-sans font-bold text-white text-[20px] hover:text-gray-300 transition-colors">
                                info@v40vital.hu
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="w-full lg:w-auto flex flex-col mt-4 lg:mt-0 items-start lg:items-end">
                <div class="flex items-center gap-4 w-full lg:w-auto">
                    <NuxtLink
                        class="flex-1 lg:flex-none text-center bg-[#F4F4F0] rounded-lg px-8 py-4 dm-sans text-[#153131] font-bold shadow-lg transition-all"
                        to="/idopont">
                        Időpontfoglalás
                    </NuxtLink>
                    <NuxtLink
                        class="flex-1 lg:flex-none text-center border-2 border-[#F4F4F0] rounded-lg px-8 py-0.5 lg:py-4 dm-sans text-[#F4F4F0] font-medium hover:bg-[#F4F4F0]/10 transition-all"
                        to="/longevity">
                        Mi az a Longevity?
                    </NuxtLink>
                </div>
            </div>
        </div>
    </div>
</template>