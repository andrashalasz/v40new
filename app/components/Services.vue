<template>
    <div class="relative w-full pt-20 lg:px-[100px] bg-[#E5F7F9]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col items-center max-w-[1440px] mx-auto mb-16">
                <h2 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    Kezelés típusok
                </h2>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">Programjaink különböző
                    egészségügyi célokra, panaszokra és élethelyzetekre kínálnak megoldást.
                </p>
            </div>
            <div class="w-ful flex flex-col lg:flex-row justify-center items-stretch gap-4 lg:gap-8">
                <NuxtLink to="/kezelesek" class="bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%]">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="50.png" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">Infúziós kezelések</p>
                    <p class="text-[#171008] dm-sans text-[18px]">Az infúziós vitaminterápia során vitaminok, ásványi
                        anyagok és antioxidánsok közvetlenül a véráramba kerülnek, így gyorsan hasznosulnak.
                        A kezeléseket orvosi felügyelet mellett, személyre szabott állapotfelmérés alapján állítjuk
                        össze.
                    </p>
                </NuxtLink>
                <div class="flex flex-col w-full lg:w-[33%] shadow-md rounded-lg">
                    <NuxtImg class="h-full object-cover shadow-md rounded-lg" src="21.png" />
                  
                </div>
                <NuxtLink to="/kezelesek" class="bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%]">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="51.png" />
                    <div class="w-full bg-[#00000013] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">Mikrobiome programok</p>
                    <p class="text-[#171008] dm-sans text-[18px]">A bélflóra egyensúlya alapvetően befolyásolja az
                        emésztést, az immunrendszert és az anyagcserét.
                        A mikrobiom vizsgálat segít feltérképezni a bélrendszer állapotát, és személyre szabott étrendi
                        javaslatokat ad.
                    </p>
                </NuxtLink>
            </div>
            <div class="w-ful flex flex-col lg:flex-row justify-center items-stretch gap-4 lg:gap-8 mt-8">
                <NuxtLink to="/kezelesek" class="bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%]">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="52.png" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">V4o SHAPE</p>
                    <p class="text-[#171008] dm-sans text-[18px]">A V40 Shape egy modern, orvosi testformáló kezelés,
                        amely elektromágneses és rádiófrekvenciás technológiával aktiválja a mélyizmokat.
                        Segíthet az izomtónus javításában és a testkontúr formálásában, műtét és felépülési idő nélkül.
                    </p>
                </NuxtLink>
                <NuxtLink to="/kezelesek" class="bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%]">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="53.png" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">Orvosi testsúlycsökkentés</p>
                    <p class="text-[#171008] dm-sans text-[18px]">Az orvosi testsúlycsökkentő program segít
                        biztonságosan csökkenteni a testsúlyt és javítani az anyagcsere-egészséget.
                        A cél a fenntartható fogyás és a szív- és érrendszeri kockázatok csökkentése.
                    </p>
                </NuxtLink>
                <NuxtLink to="/kezelesek" class="bg-white p-11 rounded-lg flex flex-col w-full shadow-md lg:w-[33%]">
                    <NuxtImg class="h-[92px] mb-10 self-start" src="51.png" />
                    <div class="w-full bg-[#0000001A] h-[1px] mb-8"></div>
                    <p class="font-medium text-[#171008] text-[28px] mb-2.5">Anyajegy vizsgálat</p>
                    <p class="text-[#171008] dm-sans text-[18px]">A FotoFinder technológiával végzett digitális
                        anyajegyszűrés teljes testtérképet készít a bőr elváltozásairól.
                        Így a legkisebb változások is időben felismerhetők, ami segíti a bőrrák korai diagnózisát.
                    </p>
                </NuxtLink>
            </div>
            <div class="w-full flex justify-center my-16">
                <NuxtLink
                    class="flex-1 lg:flex-none text-center border-2 border-[#153131] rounded-lg px-8 py-4 dm-sans text-[#153131] font-medium hover:bg-[#F4F4F0]/10 transition-all"
                    to="/kalkulacio">
                    Nem tudom mire van szükségem
                </NuxtLink>
            </div>
            <div class="w-full flex justify-center mt-4 mb-10">
                <div class="relative w-[670px] h-[573px] bg-cover bg-center rounded-2xl shadow-lg"
                    style="background-image: url('26.png');">
                    <div class="hidden lg:absolute lg:-right-40 lg:top-52 bg-white lg:max-w-[330px] rounded-lg p-6 lg:p-8 gap-4 lg:flex flex-col">
                        <p class="text-[#171008] dm-sans font-medium text-[24px]">
                            Kinek ajánljuk?
                        </p>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
                                Tudatosan, hosszú távon gondolkodsz az egészségedről
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
                                Fontos számodra az orvosi minőség és a személyre szabott figyelem
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
                                Nem gyors megoldást, hanem átgondolt szemléletet keresel
                            </p>
                        </div>
                    </div>
                    <div class="hidden lg:absolute lg:-left-40 lg:top-52 bg-white lg:max-w-[330px] rounded-lg p-6 lg:p-8 gap-4 lg:flex flex-col">
                        <p class="text-[#171008] dm-sans font-medium text-[24px]">
                            Kinek nem ajánljuk?
                        </p>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
                                Gyors megoldást vársz alapos kivizsgálás nélkül
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
                                Számodra az ár fontosabb, mint a minőség
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <NuxtImg class="h-6" src="27.svg" />
                            <p class="text-[#00000080] dm-sans text-[16px]">
                                Egyetlen kezeléstől vársz teljes változást
                            </p>
                        </div>
                    </div>
                </div>
        </div>

            <div class="lg:hidden  bg-white rounded-lg p-6 lg:p-8 gap-4 flex flex-col">
                <p class="text-[#171008] dm-sans font-medium text-[24px]">
                    Kinek ajánljuk?
                </p>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        Tudatosan, hosszú távon gondolkodsz az egészségedről
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        Fontos számodra az orvosi minőség és a személyre szabott figyelem
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        Nem gyors megoldást, hanem átgondolt szemléletet keresel
                    </p>
                </div>
            </div>
            <div class="lg:hidden bg-white rounded-lg p-6 lg:p-8 gap-4 mt-6 flex flex-col">
                <p class="text-[#171008] dm-sans font-medium text-[24px]">
                    Kinek nem ajánljuk?
                </p>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        Gyors megoldást vársz alapos kivizsgálás nélkül
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        Számodra az ár fontosabb, mint a minőség
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <NuxtImg class="h-6" src="27.svg" />
                    <p class="text-[#00000080] dm-sans text-[16px]">
                        Egyetlen kezeléstől vársz teljes változást
                    </p>
                </div>
            </div>
            <div class="w-full flex justify-center my-20">
                <NuxtLink
                    class="flex-1 lg:flex-none bg-[#153131] text-center rounded-lg px-8 py-4 dm-sans text-[#F4F4F0] font-medium transition-all"
                    to="/idopont">
                    Időpontfoglalás
                </NuxtLink>
            </div>
        </div>
    </div>
</template>