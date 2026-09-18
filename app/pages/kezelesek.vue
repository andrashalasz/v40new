<template>
    <Header />
    <KezBanner />
    <Search />
    <Footer />
</template>

<script setup>
const { t } = await useContent()
useSeoMeta({
    title: () => `${t('nav.treatments', 'Kezelések')} | V40 Vital`,
})
</script>