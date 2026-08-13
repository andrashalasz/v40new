<script setup>
// SSR adatlekérés
const { data: blogs, pending } = await useFetch('/api/blogs', {
    // Itt adhatsz meg opciókat, pl. transform-ot, ha csak bizonyos mezők kellenek
});

const slugify = (text) => {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}
</script>

<template>
    <div v-if="blogs && blogs.length > 0" class="relative w-full lg:px-[100px] py-10 bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="flex flex-col max-w-[1440px] mx-auto mb-16">
                <h2 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-[#171008]">
                    Legfrissebb írásaink 
                </h2>
                <p class="dm-sans text-[#171008] text-[18px] lg:max-w-[540px]">
                    Friss cikkeinkben közérthetően írunk a longevityről, kezelésekről és egészségmegőrzésről.
                </p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <NuxtLink v-for="blog in blogs" :key="blog.id" :to="`/blog/${slugify(blog.title)}`">
                    <NuxtImg :src="blog.picUrl" :alt="blog.title"
                        class="h-[260px] object-cover rounded-[16px] mb-2" />
                    <div class="">
                        <h3 class="text-[18px] lg:text-[24px] font-medium dm-sans mb-4 mt-2 text-[#171008]">{{ blog.title }}</h3>
                        <p class="text-[#171008] dm-sans text-[14px] lg:text-[18px] line-clamp-2">{{ blog.lead }}</p>
                    </div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>