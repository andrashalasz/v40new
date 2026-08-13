<template>
    <header class="bg-white sticky top-0 w-full p-6 flex items-center justify-between px-4 lg:px-16 z-50">
        <NuxtLink to="/" class="relative z-50">
            <NuxtImg class="h-9" src="logo3.webp" />
        </NuxtLink>

        <div class="hidden lg:flex items-center gap-10">
            <NuxtLink to="/kezelesek" class="dm-sans text-[#171008] text-[16px]">Kezelések</NuxtLink>
            <NuxtLink to="/longevity" class="dm-sans text-[#171008] text-[16px]">Longevity</NuxtLink>
            <NuxtLink to="/kalkulacio" class="dm-sans text-[#171008] text-[16px]">Navigátor</NuxtLink>
            <NuxtLink to="/rolunk" class="dm-sans text-[#171008] text-[16px]">Rólunk</NuxtLink>
            <NuxtLink to="/gyik" class="dm-sans text-[#171008] text-[16px]">GYIK</NuxtLink>
            <NuxtLink to="/blogok" class="dm-sans text-[#171008] text-[16px]">Blog</NuxtLink>
            <NuxtLink to="/kapcsolat" class="dm-sans text-[#171008] text-[16px]">Kapcsolat</NuxtLink>
            
        </div>

        <button @click="isMenuOpen = !isMenuOpen" class="lg:hidden flex flex-col gap-1.5 z-50 p-2" aria-label="Menu">
            <span class="w-6 h-0.5 bg-[#171008] transition-all duration-300"
                :class="{ 'rotate-45 translate-y-2': isMenuOpen }"></span>
            <span class="w-6 h-0.5 bg-[#171008] transition-all duration-300"
                :class="{ 'opacity-0': isMenuOpen }"></span>
            <span class="w-6 h-0.5 bg-[#171008] transition-all duration-300"
                :class="{ '-rotate-45 -translate-y-2': isMenuOpen }"></span>
        </button>

        <Transition name="slide">
            <div v-if="isMenuOpen"
                class="absolute top-full left-0 w-full bg-white border-t border-gray-100 shadow-xl lg:hidden flex flex-col p-6 gap-6">
                <NuxtLink @click="isMenuOpen = false" to="/kezelesek"
                    class="dm-sans text-[#171008] text-[18px] font-medium">Szolgáltatások</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/kalkulacio"
                    class="dm-sans text-[#171008] text-[18px] font-medium">Navigátor</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/blogok"
                    class="dm-sans text-[#171008] text-[18px] font-medium">Blog</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/rolunk"
                    class="dm-sans text-[#171008] text-[18px] font-medium">Rólunk</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/kapcsolat"
                    class="dm-sans text-[#171008] text-[18px] font-medium">Kapcsolat</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/gyik" class="dm-sans text-[#171008] text-[18px] font-medium">
                    GYIK</NuxtLink>
            </div>
        </Transition>
    </header>
</template>

<script setup>
const isMenuOpen = ref(false)

// Automatikusan bezárjuk a menüt, ha az útvonal megváltozik
const route = useRoute()
watch(() => route.path, () => {
    isMenuOpen.value = false
})
</script>

<style scoped>
/* Egyszerű lenyíló animáció */
.slide-enter-active,
.slide-leave-active {
    transition: all 0.3s ease-out;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateY(-10px);
    opacity: 0;
}
</style>