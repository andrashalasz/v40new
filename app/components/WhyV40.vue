<template>
    <div class="relative w-full pt-6 lg:px-[100px] bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col items-center max-w-[1440px] mx-auto mb-16">
                <h2 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    Miért a V40Vital?
                </h2>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">Az egészségmegőrzés nálunk
                    nem általános tanácsokból, hanem adatokra épülő orvosi döntésekből indul.
                </p>
            </div>
            <div class="w-ful flex flex-col lg:flex-row justify-center items-stretch gap-4 lg:gap-8">
                <div class="bg-[#E5F7F9] p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%]">
                    <NuxtImg class="h-[72px] mb-20 self-start" src="25.svg" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">Személyreszabás</p>
                    <p class="text-[#171008] dm-sans text-[18px]">Állapotfelmérés után személyre szabott kezelési terv
                    </p>
                </div>
                <div class="bg-[#E5F7F9] p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%]">
                    <NuxtImg class="h-[72px] mb-20 self-start" src="25.svg" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">Utánkövetés</p>
                    <p class="text-[#171008] dm-sans text-[18px]">Kontroll és kezelések után finomhangolás a haladásért
                    </p>
                </div>
                <div class="bg-[#E5F7F9] p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%]">
                    <NuxtImg class="h-[72px] mb-20 self-start" src="25.svg" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">Diszkréció</p>
                    <p class="text-[#171008] dm-sans text-[18px]">Privát, nyugodt rendelő
                    </p>
                </div>
            </div>
        </div>
        <NuxtLink to="/kezelesek" class="lg:absolute lg:right-20 lg:-top-10 bg-white rounded-lg p-6 lg:p-8 gap-4 flex flex-col">
            <div class="flex items-center gap-2">
                <NuxtImg class="h-6" src="27.svg" />
                <p class="text-[#00000080] dm-sans text-[16px]">
                    Infúziós kezelések
                </p>
            </div>
            <div class="flex items-center gap-2">
                <NuxtImg class="h-6" src="27.svg" />
                <p class="text-[#00000080] dm-sans text-[16px]">
                    Mikrobiome programok
                </p>
            </div>
            <div class="flex items-center gap-2">
                <NuxtImg class="h-6" src="27.svg" />
                <p class="text-[#00000080] dm-sans text-[16px]">
                    V40 SHAPE
                </p>
            </div>
            <div class="flex items-center gap-2">
                <NuxtImg class="h-6" src="27.svg" />
                <p class="text-[#00000080] dm-sans text-[16px]">
                    Orvosi testsúlycsökkentés
                </p>
            </div>
            <div class="flex items-center gap-2">
                <NuxtImg class="h-6" src="27.svg" />
                <p class="text-[#00000080] dm-sans text-[16px]">
                    Anyajegy vizsgálat
                </p>
            </div>
        </NuxtLink>
    </div>
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