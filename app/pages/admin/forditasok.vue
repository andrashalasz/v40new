<script setup lang="ts">
// A Fordítások beolvadt a Szövegek & fordítások hubba (/admin/tartalom).
// Régi könyvjelzők/linkek átirányítása.
definePageMeta({ layout: 'admin', middleware: ['admin'] })
await navigateTo('/admin/tartalom', { redirectCode: 301 })
</script>

<template>
  <div class="p-8 text-center text-sm text-[#667085]">Átirányítás a Szövegek &amp; fordítások oldalra…</div>
</template>
