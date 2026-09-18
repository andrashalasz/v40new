<template>
    <header class="bg-white sticky top-0 w-full p-6 flex items-center justify-between px-4 lg:px-16 z-50">
        <NuxtLink to="/" class="relative z-50">
            <NuxtImg class="h-9" src="logo3.webp" />
        </NuxtLink>

        <div class="hidden lg:flex items-center gap-10">
            <NuxtLink to="/kezelesek" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.treatments', 'Kezelések') }}</NuxtLink>
            <NuxtLink to="/berletek" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.passes', 'Bérletek') }}</NuxtLink>
            <NuxtLink to="/longevity" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.longevity', 'Longevity') }}</NuxtLink>
            <NuxtLink to="/kalkulacio" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.navigator', 'Navigátor') }}</NuxtLink>
            <NuxtLink to="/rolunk" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.about', 'Rólunk') }}</NuxtLink>
            <NuxtLink to="/gyik" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.faq', 'GYIK') }}</NuxtLink>
            <NuxtLink to="/blogok" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.blog', 'Blog') }}</NuxtLink>
            <NuxtLink to="/kapcsolat" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.contact', 'Kapcsolat') }}</NuxtLink>
            <NuxtLink v-if="loggedIn" to="/fiok" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.account', 'Fiókom') }}</NuxtLink>
            <NuxtLink v-else to="/belepes" class="dm-sans text-[#171008] text-[16px]">{{ t('nav.login', 'Belépés') }}</NuxtLink>
            <LanguageSwitcher />
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
                    class="dm-sans text-[#171008] text-[18px] font-medium">{{ t('nav.treatments', 'Kezelések') }}</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/berletek"
                    class="dm-sans text-[#171008] text-[18px] font-medium">{{ t('nav.passes', 'Bérletek') }}</NuxtLink>
                <NuxtLink v-if="loggedIn" @click="isMenuOpen = false" to="/fiok"
                    class="dm-sans text-[#171008] text-[18px] font-medium">{{ t('nav.account', 'Fiókom') }}</NuxtLink>
                <NuxtLink v-else @click="isMenuOpen = false" to="/belepes"
                    class="dm-sans text-[#171008] text-[18px] font-medium">{{ t('nav.login', 'Belépés') }}</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/kalkulacio"
                    class="dm-sans text-[#171008] text-[18px] font-medium">{{ t('nav.navigator', 'Navigátor') }}</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/blogok"
                    class="dm-sans text-[#171008] text-[18px] font-medium">{{ t('nav.blog', 'Blog') }}</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/rolunk"
                    class="dm-sans text-[#171008] text-[18px] font-medium">{{ t('nav.about', 'Rólunk') }}</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/kapcsolat"
                    class="dm-sans text-[#171008] text-[18px] font-medium">{{ t('nav.contact', 'Kapcsolat') }}</NuxtLink>
                <NuxtLink @click="isMenuOpen = false" to="/gyik" class="dm-sans text-[#171008] text-[18px] font-medium">{{ t('nav.faq', 'GYIK') }}</NuxtLink>
                <div class="pt-2 border-t border-gray-100">
                    <LanguageSwitcher />
                </div>
            </div>
        </Transition>
    </header>
</template>

<script setup>
const { t } = await useContent()
const { loggedIn } = useUserSession()
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