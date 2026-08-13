<template>
    <Header />
    <div class="relative w-full pb-12 pt-12 lg:pt-20 lg:pb-20 lg:px-[100px] bg-[#E5F7F9]">
        <div class="relative w-full">
            <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
                <h1 class="text-[32px] lg:text-[64px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    Időpontfoglalás
                </h1>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">Hasznos, közérthető tartalmak
                    a longevityről, a kezelésekről és a tudatos egészségmegőrzésről.
                </p>
            </div>
            <div class="w-full max-w-[1440px] mx-auto p-4 flex flex-col mt-10 lg:px-0">
                <swazy-booking business-id="d5ca3d81-724b-4cc7-bb84-32a2630dc38a"></swazy-booking>
            </div>
        </div>
    </div>
    <WFooter />
</template>
<script setup>
    useSeoMeta({
    title: 'Időpontfoglalás | V40',

    })
    </script>