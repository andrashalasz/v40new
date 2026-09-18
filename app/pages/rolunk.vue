<template>
    <Header />
    <RolunkBanner />
    <Doctors2 />
    <Rendelonk />
    <MBanner />
    <WFooter />
</template>

<script setup>
const { t } = await useContent()
useSeoMeta({
    title: () => `${t('nav.about', 'Rólunk')} | V40 Vital`,
})
</script>