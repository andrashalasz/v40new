<template>
    <div class="relative w-full lg:px-[100px] pt-20 bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col max-w-[1440px] mx-auto mb-16">
                <h3 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-[#171008]">
                    Hogyan működik?
                </h3>
                <p class="dm-sans text-[#171008] text-[18px] lg:max-w-[500px]">Egy egészségprogram felépülése az első
                    konzultációtól a kontrollig
                </p>
            </div>
            <div class="w-ful flex flex-col lg:flex-row justify-center items-stretch gap-8 lg:gap-5">
                <div class="relative bg-[#E5F7F9] p-4 lg:p-6 rounded-lg flex flex-col w-full shadow-md lg:w-[20%]">
                    <p class="font-medium text-[#171008] text-[24px] mb-14 leading-[1.3]">Első konzultáció</p>
                    <div class="w-full bg-[#0000001A] h-[1px] mb-4"></div>
                    <p class="text-[#171008] dm-sans text-[18px]">Megismerjük a panaszaidat, céljaidat és egészségi
                        előzményeidet.
                    </p>
                    <div class="bg-[#153131] h-9 w-9 rounded-full font-semibold absolute -left-4 -top-4 text-white flex items-center justify-center">1</div>
                </div>
                <div class="relative bg-[#E5F7F9] p-4 lg:p-6 rounded-lg flex flex-col w-full shadow-md lg:w-[20%]">
                    <p class="font-medium text-[#171008] text-[24px] mb-14 leading-[1.3]">Állapotfelmérés</p>
                    <div class="w-full bg-[#0000001A] h-[1px] mb-4"></div>
                    <p class="text-[#171008] dm-sans text-[18px]">Laborvizsgálatokkal és diagnosztikai mérésekkel pontos
                        képet kapunk a szervezeted aktuális állapotáról.
                    </p>
                    <div
                        class="bg-[#153131] h-9 w-9 rounded-full font-semibold absolute -left-4 -top-4 text-white flex items-center justify-center">
                        2</div>
                </div>
                <div class="relative bg-[#E5F7F9] p-4 lg:p-6 rounded-lg flex flex-col w-full shadow-md lg:w-[20%]">
                    <p class="font-medium text-[#171008] text-[24px] mb-14 leading-[1.3]">Személyre szabott terv</p>
                    <div class="w-full bg-[#0000001A] h-[1px] mb-4"></div>
                    <p class="text-[#171008] dm-sans text-[18px]">Az eredmények alapján orvosaink egyéni egészség- és
                        longevity programot állítanak össze.
                    </p>
                    <div
                        class="bg-[#153131] h-9 w-9 rounded-full font-semibold absolute -left-4 -top-4 text-white flex items-center justify-center">
                        3</div>
                </div>
                <div class="relative bg-[#E5F7F9] p-4 lg:p-6 rounded-lg flex flex-col w-full shadow-md lg:w-[20%]">
                    <p class="font-medium text-[#171008] text-[24px] mb-14 leading-[1.3]">Célzott kezelések</p>
                    <div class="w-full bg-[#0000001A] h-[1px] mb-4"></div>
                    <p class="text-[#171008] dm-sans text-[18px]">Az állapotodhoz igazított kezelésekkel és
                        javaslatokkal elkezdjük a személyre szabott programot.
                    </p>
                    <div
                        class="bg-[#153131] h-9 w-9 rounded-full font-semibold absolute -left-4 -top-4 text-white flex items-center justify-center">
                        4</div>
                </div>
                <div class="relative bg-[#E5F7F9] p-4 lg:p-6 rounded-lg flex flex-col w-full shadow-md lg:w-[20%]">
                    <p class="font-medium text-[#171008] text-[24px] mb-14 leading-[1.3]">Kontroll és követés</p>
                    <div class="w-full bg-[#0000001A] h-[1px] mb-4"></div>
                    <p class="text-[#171008] dm-sans text-[18px]">Az eredményeket rendszeresen nyomon követjük, és
                        szükség esetén módosítjuk a programot.
                    </p>
                    <div
                        class="bg-[#153131] h-9 w-9 rounded-full font-semibold absolute -left-4 -top-4 text-white flex items-center justify-center">
                        5</div>
                </div>
                
            </div>
            <div class="w-full flex justify-end my-20">
                <NuxtLink
                    class="flex-1 lg:flex-none text-center border-2 border-[#153131] rounded-lg px-8 py-4 dm-sans text-[#153131] font-medium hover:bg-[#F4F4F0]/10 transition-all"
                    to="/gyik">
                    Irány a gyakran ismételt kérdések
                </NuxtLink>
            </div>
        </div>
    </div>
</template>
