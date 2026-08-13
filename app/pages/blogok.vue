<template>
    <Header />
    <div class="relative w-full pb-12 pt-12 lg:pt-20 lg:pb-20 lg:px-[100px] bg-[#E5F7F9]">
        <div class="relative w-full">
            <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
                <h1 class="text-[32px] lg:text-[64px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    Blog
                </h1>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">Hasznos, közérthető tartalmak
                    a longevityről, a kezelésekről és a tudatos egészségmegőrzésről.
                </p>
            </div>
       </div>
       </div>
    <LatestBlogs />
    <Blogs3 />
    <Footer />
</template>

<script setup>
useSeoMeta({
    title: 'Blogok | V40',
   
})
</script>