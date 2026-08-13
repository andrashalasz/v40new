<template>
    <div v-if="blogs && blogs.length > 0" class="w-full pt-6 lg:px-[100px] bg-[#ebebd3]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col max-w-[1440px] mx-auto mb-2">
                <h2 class="text-[28px] lg:text-[36px] sf-pro font-bold mb-8 lg:mb-10 text-[#171008] leading-[1]">
                    Legfrissebb írásaink
                </h2>
            </div>
            
            <div ref="scrollContainer" class="w-full flex gap-4 lg:gap-8 overflow-x-scroll">
                <NuxtLink v-if="blogs" :to="`/blog/${blog.slug}`" v-for="blog in blogs" :key="blog.id"
                    class="bg-[#171008] rounded-xl relative w-[258px] lg:w-[280px] flex-shrink-0 mb-4 p-4">
                    <img :src="blog.widePicUrl" alt="Blog image"
                        class="w-full object-cover min-h-[129px] lg:min-h-[195px] rounded-[18px]" />
                    <div class="w-full">
                        <h3 class="text-[16px] lg:text-[18px] text-[#ebebd3] sf-pro font-bold mb-2 line-clamp-1 mt-2">
                            {{ blog.title }}
                        </h3>
                        <p v-if="blog.lead"
                            class="text-[#ebebd3] mb-3 text-[12px] lg:text-[14px] line-clamp-2 min-h-[2.5rem]">
                            {{ blog.lead }}
                        </p>
                        <div class="flex items-center gap-2 w-full justify-between">
                            <div class="text-[#070707] text-[12px] lg:text-[14px]">
                                {{ formatDate(blog.createdAt) }}
                            </div>
                            
                        </div>
                    </div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<script setup>
const { data } = await useFetch(`/api/blogs`);
const blogs = computed(() => data.value ?? null);
const scrollContainer = ref(null);

const formatDate = (dateString) => {
    return dateString.slice(0, 10).replace(/-/g, '. ');
}

</script>

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