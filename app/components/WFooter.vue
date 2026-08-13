<template>
    <footer class="w-full py-16 px-4 lg:px-[100px] bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-6 lg:gap-0">
            <div class="w-full lg:w-1/2 flex flex-col flex-start">
                <NuxtImg class="h-28 mb-8 self-start" src="logo1.svg" />
                <p class="dm-sans text-[#00000080] text-[16px]">A hosszú élet önmagában nem elég. Mi az egészségesen,
                    aktívan és jobb közérzettel megélt évekre fókuszálunk.</p>
                    <div class="flex items-center gap-4 mt-10 lg:mt-20">
                    <NuxtLink to="https://www.tiktok.com/@v40vital?is_from_webapp=1&sender_device=pc">
                        <NuxtImg class="h-20" src="s1.png" />
                    </NuxtLink>
                    <NuxtLink to="https://www.instagram.com/v40vital/">
                        <NuxtImg class="h-20" src="s2.png" />
                    </NuxtLink>
                    <NuxtLink to="https://www.facebook.com/people/V40Vital/61577439698033/?sk=directory_contact_info">
                        <NuxtImg class="h-20" src="s3.png" />
                    </NuxtLink>
                </div>
            </div>
            <div class="w-full lg:w-1/2 flex gap-6 lg:justify-end">
                <div class="flex flex-col">
                        <p class="dm-sans font-medium text-[#171008] text-[18px] mb-4">Linkek</p>
                      <NuxtLink to="/kezelesek" class="dm-sans text-[#171008] text-[16px] mb-2">Kezelések</NuxtLink>
                    <NuxtLink to="/kalkulacio" class="dm-sans text-[#171008] text-[16px] mb-2">Navigátor</NuxtLink>
                    <NuxtLink to="/blogok" class="dm-sans text-[#171008] text-[16px] mb-2">Blog</NuxtLink>
                    <NuxtLink to="/rolunk" class="dm-sans text-[#171008] text-[16px] mb-2">Rólunk</NuxtLink>
                    <NuxtLink to="/kapcsolat" class="dm-sans text-[#171008] text-[16px] mb-2">Kapcsolat</NuxtLink>
                    <NuxtLink to="/gyik" class="dm-sans text-[#171008] text-[16px] mb-2">GYIK</NuxtLink>
                    <NuxtLink to="/adatvedelmi" class="dm-sans text-[#171008] text-[16px] mb-2">Adatvédelmi tájékoztató
                    </NuxtLink>
                    <NuxtLink to="/aszf" class="dm-sans text-[#171008] text-[16px]">ÁSZF
                    </NuxtLink>
                    </div>
            </div>
        </div>
    </footer>
</template>