<script setup lang="ts">
const { t } = await useContent()
const locale = useLocale()
const { data } = await useFetch<{ intro: string; after: string }>('/api/longevity-page', { query: { locale } })
useSeoMeta({ title: () => `${t('nav.longevity', 'Longevity')} | V40 Vital` })
</script>

<template>
    <Header />
    <LazyLongevityBanner />

    <div class="w-full bg-[#F4F4F0] py-12 lg:py-16 lg:px-[100px]">
        <div class="w-full max-w-[920px] mx-auto p-4 lg:px-0">
            <div v-html="data?.intro" />
            <LongevityServices />
            <div v-html="data?.after" />
        </div>
    </div>

    <LatestBlogs />
    <MBanner />
    <WFooter />
</template>
