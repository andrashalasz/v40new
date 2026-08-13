<script setup>
// SSR adatlekérés
const { data: doctors, pending } = await useFetch('/api/doctors', {
    // Itt adhatsz meg opciókat, pl. transform-ot, ha csak bizonyos mezők kellenek
});
</script>

<template>
    <div class="relative w-full lg:px-[100px] py-10 bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col max-w-[1440px] mx-auto mb-16">
                <h2 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-[#171008]">
                    Orvosaink
                </h2>
                <p class="dm-sans text-[#171008] text-[18px] lg:max-w-[540px]">
                    Orvosi csapatunk a szakmai precizitást, a személyes figyelmet és a hosszú távú egészség szemléletét
                    képviseli.
                </p>
            </div>

            <div v-if="pending" class="text-center py-10">Betöltés...</div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div v-for="doctor in doctors" :key="doctor.id" class="">
                    <NuxtImg :src="doctor.picUrl" :alt="doctor.name"
                        class="w-full lg:h-[320px] object-cover rounded-lg mb-2" />
                    <div class="">
                        <h3 class="text-[24px] font-medium dm-sans text-[#171008]">{{ doctor.name }}</h3>
                        <p class="text-[#171008] dm-sans text-[18px] mb-3">{{ doctor.category }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>