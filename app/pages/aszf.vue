<script setup lang="ts">
const { t } = await useContent()
const locale = useLocale()
const { data } = await useFetch<{ html: string }>('/api/legal/aszf', { query: { locale } })
useSeoMeta({ title: () => `${t('nav.terms', 'ÁSZF')} | V40 Vital` })
</script>

<template>
    <Header />
    <div
        class="max-w-4xl mx-auto px-6 py-12 bg-white text-gray-800 leading-relaxed shadow-sm my-10 rounded-2xl"
        v-html="data?.html"
    />
    <Footer />
</template>
