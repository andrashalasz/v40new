<script setup lang="ts">
/** Longevity diagnosztika – csomag-összehasonlító táblázat a felugró ablakban. */
const { t } = await useContent()
const locale = useLocale()
const { data } = await useFetch<{ packages: string[]; rows: { item: string; has: boolean[] }[] }>('/api/longevity-packages', { query: { locale } })
const packages = computed(() => data.value?.packages ?? [])
const rows = computed(() => data.value?.rows ?? [])
</script>

<template>
  <div v-if="rows.length" class="mt-6">
    <p class="dm-sans font-semibold text-[17px] text-[#153131] mb-3">{{ t('longevity.packagesTitle', 'Vizsgálati csomagok') }}</p>
    <div class="overflow-x-auto rounded-lg border border-[#0000001A]">
      <table class="w-full text-[14px] dm-sans border-collapse">
        <thead>
          <tr class="bg-[#F0F7F7]">
            <th class="text-left font-semibold px-3 py-2.5 text-[#171008]">{{ t('longevity.examItem', 'Vizsgálati elem') }}</th>
            <th v-for="p in packages" :key="p" class="px-3 py-2.5 text-center font-semibold text-[#153131] whitespace-nowrap">{{ p }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="i" :class="i % 2 ? 'bg-[#F7FBFB]' : 'bg-white'">
            <td class="px-3 py-2 text-[#171008] border-t border-[#0000000D]">{{ r.item }}</td>
            <td v-for="(h, ci) in r.has" :key="ci" class="px-3 py-2 text-center border-t border-[#0000000D]">
              <span v-if="h" class="text-[#1F6B4A] font-bold">✓</span>
              <span v-else class="text-[#00000030]">–</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
