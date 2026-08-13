<script setup>
const order = ['Vértes', 'Szabó', 'Péter', 'Gájer'];

const { data: doctors, pending } = await useFetch('/api/doctors', {
    transform: (data) => {
        return data.sort((a, b) => {
            const indexA = order.findIndex(name => a.name.includes(name));
            const indexB = order.findIndex(name => b.name.includes(name));
            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
        });
    }
});
</script>

<template>
    <div class="relative w-full lg:px-[100px] pb-10 bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col items-center max-w-[1440px] mx-auto mb-16">
                <h2 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    Orvosaink
                </h2>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">
                    A V40Vital programjait tapasztalt orvosok állítják össze és kísérik végig
                </p>
            </div>

            <div v-if="pending" class="text-center py-10">Betöltés...</div>

            <div v-else class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div v-for="doctor in doctors" :key="doctor.id" class="flex flex-col">
                    <NuxtImg :src="doctor.picUrl" :alt="doctor.name"
                        class="w-full lg:h-[320px] object-cover rounded-lg mb-4" />
                    <div>
                        <h3 class="text-[24px] font-medium dm-sans text-[#171008]">{{ doctor.name }}</h3>
                        <p class="text-[#171008] dm-sans text-[18px] font-semibold mb-1">{{ doctor.category }}</p>
                        <p class="text-[#171008] dm-sans text-[16px] leading-relaxed">{{ doctor.desc }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>