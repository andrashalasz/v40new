<template>
    <Header />
    <div class="relative w-full pb-12 pt-12 lg:pt-16 lg:pb-16 lg:px-[100px] bg-[#E5F7F9]">
        <div class="relative w-full">
            <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
                <h1 class="text-[32px] lg:text-[64px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    Kinek való? Döntéstámogatás
                </h1>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">Minden információ a longevity
                    programról, kezelésekról,tanulmányokról és kezeléseink beszámolói
                </p>
            </div>
        </div>
    </div>
    <div class="relative w-full pt-10 lg:px-[100px] bg-[#E5F7F9]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="flex flex-col items-center">
                <div v-for="(q, index) in questions" :key="q.id"
                    class="bg-white w-full lg:w-[600px] rounded-[8px] p-6 shadow-sm mb-6 border transition-all duration-300" :class="[
                        currentStep >= index ? 'opacity-100' : 'opacity-40 pointer-events-none scale-95',
                        answers[q.id] ? 'border-green-100 bg-green-50/20' : 'border-gray-100'
                    ]">
                    <div class="flex items-center gap-4 mb-4">
                        <h2 class="text-lg font-semibold text-[#171008] dm-sans">{{ q.text }}</h2>
                    </div>

                    <div class="grid grid-cols-1 gap-3">
                        <button v-for="opt in q.options" :key="opt.value" @click="handleAnswer(q.id, opt.value, index)"
                            class="flex items-center gap-4 p-4 rounded-xl border-2 transition-all" :class="answers[q.id] === opt.value
                                ? 'border-black'
                                : 'border-gray-100 hover:border-gray-200 text-gray-600'">
                           
                            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                                :class="answers[q.id] === opt.value ? 'border-black' : 'border-gray-300'">
                                <div v-if="answers[q.id] === opt.value" class="w-2.5 h-2.5 bg-black rounded-full">
                                </div>
                            </div>
                            <span class="font-medium">{{ opt.label }}</span>
                        </button>
                    </div>
                </div>
                <div v-if="isFinished" ref="resultCard" class="flex flex-col gap-4 mt-10">
                    <h3 class="text-[24px] lg:text-[32px] dm-sans font-bold lg:mb-2 text-center text-[#171008]">
                        Eredmény - ajánlott szolgáltatáscsomag
                    </h3>
                    <p class="dm-sans text-[#171008] text-[16px] text-center mb-6">Minden információ a
                        longevity programról, kezelésekról,tanulmányokról és kezeléseink beszámolói
                    </p>
                    <NuxtLink 
                        :to="`/szolgaltatas/${slugify(recommendedProduct?.title)}`"
                        class="w-full flex flex-col bg-white rounded-lg lg:flex-row justify-between">
                        <div class="flex flex-col lg:flex-row items-center lg:gap-6">
                            <NuxtImg :src="recommendedProduct?.picUrl" :alt="recommendedProduct?.title"
                                class="w-full lg:h-[280px] lg:w-[280px] object-cover flex-shrink-0 rounded-xl" />
                            <div class="p-4 lg:p-6">
                                <h3 class="font-medium text-[24px] text-[#171008] dm-sans mb-2">{{ recommendedProduct?.title }}</h3>
                                <p class="text-[#171008] text-[16px] dm-sans mb-4 lg:max-w-[380px] line-clamp-2">{{ recommendedProduct?.desc }}</p>
                                <div class="flex items-center gap-3 lg:mt-10 mb-4 lg:mb-0">
                                    <div class="bg-[#2F73F21A] rounded-sm text-[#153131] text-[16px] dm-sans px-2 py-1">
                                        {{ recommendedProduct?.time }} perc</div>
                                    <div class="bg-[#2F73F21A] rounded-sm text-[#153131] text-[16px] dm-sans px-2 py-1">
                                        {{ recommendedProduct?.type }}</div>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col justify-center p-4 lg:p-0 lg:pr-6">
                            <p class="text-[24px] text-[#171008] dm-sans font-medium mb-8 lg:mb-14">{{ new Intl.NumberFormat('hu-HU').format(recommendedProduct?.price) }}
                                Ft</p>
                            <NuxtLink
                                class="flex-1 lg:flex-none text-center border-2 border-[#153131] rounded-lg px-8 py-4 dm-sans text-[#153131] font-medium hover:bg-[#F4F4F0]/10 transition-all"
                                :to="`/szolgaltatas/${slugify(recommendedProduct?.title)}`">
                                Bővebben
                            </NuxtLink>
                        </div>
                    </NuxtLink>
                </div>


            </div>
        </div>
    </div>
    <WFooter />
</template>

<script setup>
const { data: products } = useFetch('/api/products')

const currentStep = ref(0)
const answers = ref({})
const isFinished = ref(false)
const resultCard = ref(null);

useSeoMeta({
title: 'Navigátor| V40',

})

const questions = [
    {
        id: 'gender',
        text: 'Neme',
        options: [{ label: 'Férfi', value: 'ferfi' }, { label: 'Nő', value: 'no' }]
    },
    {
        id: 'goal',
        text: 'Mi a célja a látogatással?',
        options: [
            { label: 'Energia növelés', value: 'energy' },
            { label: 'Sport regeneráció', value: 'sport' },
            { label: 'Immunerősítés', value: 'immune' },
            { label: 'Bőrfiatalítás', value: 'beauty' }
        ]
    },
    {
        id: 'age_group',
        text: 'Életkor',
        options: [
            { label: '20-40 év között', value: 'young' },
            { label: '40-60 év között', value: 'mid' },
            { label: '60 év felett', value: 'senior' }
        ]
    }
]

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

const handleAnswer = (qId, value, index) => {
    answers.value[qId] = value

    if (index === currentStep.value && currentStep.value < questions.length - 1) {
        currentStep.value++
    } else if (index === questions.length - 1) {
        isFinished.value = true

        // Várni kell egy kicsit, amíg a Vue lerendeli a v-if-et
        nextTick(() => {
            if (resultCard.value) {
                resultCard.value.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start' // A kártya tetejét hozza a képernyő tetejére
                });
            }
        });
    }
}

// Logika a CSV alapján
const recommendedProduct = computed(() => {
    if (!products.value) return null

    const a = answers.value

    // Példa logika a feltöltött CSV-ből:
    if (a.goal === 'beauty') return products.value.find(p => p.title.includes('Radiance'))
    if (a.goal === 'energy') return products.value.find(p => p.title.includes('NAD+'))
    if (a.goal === 'sport' && a.age_group === 'senior') return products.value.find(p => p.title.includes('CardioFit'))
    if (a.goal === 'sport') return products.value.find(p => p.title.includes('Powerfuel'))
    if (a.gender === 'no' && a.age_group === 'mid') return products.value.find(p => p.title.includes('Femina'))

    return products.value[0] // Alapértelmezett (Signature)
})
</script>

<style scoped>
.animate-bounce-in {
    animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes bounceIn {
    0% {
        transform: scale(0.9);
        opacity: 0;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}
</style>