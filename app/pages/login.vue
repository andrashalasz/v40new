<script setup lang="ts">
// A külön /login oldal megszűnt: az admin belépés a /admin oldalon történik.
// Bárki ide téved, átirányítjuk oda.
definePageMeta({ layout: false })
await navigateTo('/admin', { replace: true })
</script>

<template>
  <div />
</template>
