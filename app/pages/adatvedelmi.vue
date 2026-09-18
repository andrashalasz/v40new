<script setup lang="ts">
const { t } = await useContent()
const locale = useLocale()
const { data } = await useFetch<{ html: string }>('/api/legal/adatvedelmi', { query: { locale } })
useSeoMeta({ title: () => `${t('nav.privacy', 'Adatvédelmi tájékoztató')} | V40 Vital` })
</script>

<template>
    <Header />
    <div
        class="max-w-4xl mx-auto px-6 py-12 bg-white text-gray-800 dm-sans leading-relaxed"
        v-html="data?.html"
    />
    <Footer />
</template>
