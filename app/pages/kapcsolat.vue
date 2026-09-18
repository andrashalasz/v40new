<template>
    <Header />
    <KapcsBanner />
    <Longevity2 />
    <MBanner />
    <Social />
    <Footer />
</template>

<script setup>
const { t } = await useContent()
useSeoMeta({
    title: () => `${t('nav.contact', 'Kapcsolat')} | V40 Vital`,
})
</script>