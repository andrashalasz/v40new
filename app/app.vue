<template>
        <div>
                <NuxtPage />
        </div>
</template>

<script setup>
useHead({
        title: 'V40 Vital',
        link: [
                { rel: 'icon', type: 'image/x-icon', href: '/favicon.svg' },
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
                {
                        rel: 'stylesheet',
                        href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Manrope:wght@200..800&display=swap'
                }
        ],
        style: [
                {
                        children: `
        body {
          font-family: 'Manrope', sans-serif;
        }
        .manrope { font-family: 'Manrope', sans-serif; }
        .dm-sans { font-family: 'DM Sans', sans-serif; }
      `
                }
        ]
})
</script>

<style>
.dm-sans {
        font-family: 'DM Sans', sans-serif;
}
</style>