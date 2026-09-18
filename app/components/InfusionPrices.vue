<script setup lang="ts">
/** Infúziós árlista táblázat – a felugró ablakban jelenik meg. */
const { t } = await useContent()
const locale = useLocale()
const { data } = await useFetch<{ items: { name: string; subtitle: string; price: number }[] }>('/api/infusion-prices', { query: { locale } })
const items = computed(() => data.value?.items ?? [])
const Ft = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'
</script>

<template>
  <div v-if="items.length" class="mt-6">
    <p class="dm-sans font-semibold text-[17px] text-[#153131] mb-3">{{ t('infuzio.priceTitle', 'Infúziók és árak') }}</p>
    <div class="rounded-lg border border-[#0000001A] overflow-hidden">
      <div
        v-for="(it, i) in items"
        :key="it.name"
        class="flex items-center justify-between gap-4 px-4 py-2.5"
        :class="i % 2 ? 'bg-[#F7FBFB]' : 'bg-white'"
      >
        <span class="min-w-0">
          <b class="block text-[15px] text-[#171008] truncate">{{ it.name }}</b>
          <span class="text-[13px] text-[#00000080]">{{ it.subtitle }}</span>
        </span>
        <b class="dm-sans text-[15px] text-[#153131] whitespace-nowrap">{{ Ft(it.price) }}</b>
      </div>
    </div>
    <p class="text-[12px] text-[#00000080] mt-2">
      {{ t('infuzio.priceNote', 'A feltüntetett árak egy infúziós alkalomra vonatkoznak, tájékoztató jellegűek. A megfelelő infúzió kiválasztása orvosi konzultáció alapján történik.') }}
    </p>
  </div>
</template>
