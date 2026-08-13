<template>
   <Header />
    <div class="relative w-full lg:px-[160px] pt-8 lg:pt-20 pb-20 bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto p-4 flex flex-col lg:flex-row lg:gap-20 lg:px-0">
            <NuxtImg :src="product.product.picUrl" class="w-full lg:w-[520px] lg:h-[520px] object-cover rounded-lg" />
            <div class="flex flex-col w-full">
                <h1 class="text-[28px] lg:text-[48px] leading-[1.2] dm-sans font-bold mb-4 mt-6 lg:mt-0 text-[#171008]">
                    {{ product.product.title }}
                </h1>
                <p class="dm-sans text-[#171008] text-[18px] lg:max-w-[540px] whitespace-pre-line">
                   {{ product.product.desc.replace(/\\n/g, '\n\n') }}
                </p>
                <div class="flex items-center gap-3 mt-6 mb-14">
                    <div class="bg-[#2F73F21A] rounded-sm text-[#153131] text-[16px] dm-sans px-2 py-1">{{ product.product.time
                    }} perc</div>
                    <div class="bg-[#2F73F21A] rounded-sm text-[#153131] text-[16px] dm-sans px-2 py-1">{{ product.product.type
                    }}</div>
                </div>
                <div class="w-full flex flex-col gap-4 lg:gap-0 lg:flex-row lg:items-center lg:justify-between">
                    <p class="dm-sans font-bold text-[#171008] text-[28px] lg:text-[32px]">{{ new Intl.NumberFormat('hu-HU').format(product.product.price) }} Ft</p>
                    <button @click="handleBooking(product.product.title)"
                        class="flex-1 lg:flex-none bg-[#153131] text-center rounded-lg px-8 py-4 dm-sans text-[#F4F4F0] font-medium transition-all"
                        >
                        Időpontfoglalás
                    </button>
                </div>
            </div>
        </div>
        <div v-if="showBooking" class="w-full max-w-[1440px] mx-auto p-4 flex flex-col mt-10 lg:px-0">
            <swazy-booking  business-id="d5ca3d81-724b-4cc7-bb84-32a2630dc38a"></swazy-booking>
        </div>
        <div v-if="product.related && product.related.length > 0" class="w-full max-w-[1440px] mx-auto p-4 flex flex-col mt-20 lg:mt-40 lg:px-0">
            <h1 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-[#171008]">
                Hasonló termékek
            </h1>
            <p class="dm-sans text-[#171008] text-[18px] mb-14 lg:max-w-[540px]">
                Prémium állapotfelmérésre építünk, és személyre szabott kezelésekkel támogatjuk a céljaidat
            </p>
            <div class="grid grid-cols-1 gap-6">
                <NuxtLink v-for="product in product.related" :key="product.id" :to="`/szolgaltatas/${product.slug}`"
                    class="w-full flex flex-col lg:flex-row justify-between">
                    <div class="flex flex-col lg:flex-row items-center gap-6">
                        <NuxtImg :src="product.picUrl" :alt="product.title"
                            class="h-[280px] w-[280px] object-cover rounded-xl mb-4" />
                        <div>
                            <h3 class="font-medium text-[24px] text-[#171008] dm-sans mb-2">{{ product.title }}</h3>
                            <p class="text-[#171008] text-[16px] dm-sans mb-4 line-clamp-2">{{ product.desc.replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim() }}</p>
                            <div class="flex items-center gap-3 lg:mt-10 mb-4 lg:mb-0">
                                <div class="bg-[#2F73F21A] rounded-sm text-[#153131] text-[16px] dm-sans px-2 py-1">{{
                                    product.time }} perc</div>
                                <div class="bg-[#2F73F21A] rounded-sm text-[#153131] text-[16px] dm-sans px-2 py-1">{{
                                    product.type }}</div>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-col justify-center">
                        <p class="text-[24px] text-[#171008] dm-sans font-medium mb-8 lg:mb-14">{{ new Intl.NumberFormat('hu-HU').format(product.price) }} Ft
                        </p>
                        <NuxtLink
                            class="flex-1 lg:flex-none text-center border-2 border-[#153131] rounded-lg px-8 py-4 dm-sans text-[#153131] font-medium hover:bg-[#F4F4F0]/10 transition-all"
                            :to="`/szolgaltatas/${product.slug}`">
                            Bővebben
                        </NuxtLink>
                    </div>
                </NuxtLink>
            </div>
      
 </div>
        </div>
   <Footer />
</template>

<script setup>
const showBooking = ref(false)

const route = useRoute()
const { data: product } = await useFetch('/api/products', {
    query: { slug: route.params.slug }
})

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

const handleBooking = (title) => {
    if (title === 'Anyajegyvizsgálat FotoFinderrel®') {
        // Külső oldal megnyitása új lapon
        window.open('https://www.anyajegyklinika.hu/', '_blank');
    } else {
        showBooking.value = true;
    }
}
</script>