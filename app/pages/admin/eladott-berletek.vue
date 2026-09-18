<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

interface Pass {
  id: number
  code: string
  title: string
  customerName: string
  customerEmail: string
  status: string
  sessionsTotal: number | null
  sessionsRemaining: number | null
  validFrom: string
  validUntil: string
  purchasePriceGross: number
  orderNumber: string | null
  orderStatus: string | null
  refundable: boolean
}

const { data, status, refresh } = await useFetch<{ items: Pass[] }>('/api/admin/customer-passes')
const items = computed(() => data.value?.items ?? [])

const huf = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'
const d = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeZone: 'Europe/Budapest' }).format(new Date(iso))

const statusStyle: Record<string, string> = {
  ACTIVE: 'bg-[#E9F3F2] text-[#153131]',
  EXHAUSTED: 'bg-[#FEF3E7] text-[#B25E09]',
  EXPIRED: 'bg-[#F2F4F7] text-[#667085]',
  PENDING_PAYMENT: 'bg-[#FEF3E7] text-[#B25E09]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
  REFUNDED: 'bg-[#FBE9E9] text-[#B42318]',
}

const toast = ref('')
const busy = ref<number | null>(null)

async function refund(p: Pass) {
  if (!confirm(`Biztosan visszatéríted?\n${p.customerName} · ${p.title}`)) return
  busy.value = p.id
  try {
    const res = await $fetch<{ refunded: number }>(`/api/admin/customer-passes/${p.id}/refund`, { method: 'POST' })
    toast.value = res.refunded > 0 ? `Visszatérítve: ${huf(res.refunded)}` : 'A bérlet lezárva (nem volt online fizetés).'
    await refresh()
    setTimeout(() => (toast.value = ''), 4000)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    toast.value = err.data?.statusMessage ?? err.statusMessage ?? 'A visszatérítés nem sikerült.'
    setTimeout(() => (toast.value = ''), 5000)
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="font-bold text-[24px] tracking-tight">Eladott bérletek</h1>
      <p class="text-[#667085] text-sm mt-0.5">
        Az ügyfelek által megvásárolt bérletek. Aktív bérlet visszatéríthető (sztornó számlával).
      </p>
    </div>

    <div v-if="toast" class="mb-4 rounded-lg bg-[#E9F3F2] text-[#153131] px-4 py-3 text-sm font-semibold">{{ toast }}</div>

    <div class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FAFAFB]">
              <th v-for="h in ['Bérlet', 'Páciens', 'Alkalom', 'Érvényes', 'Ár', 'Státusz', '']" :key="h"
                class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] whitespace-nowrap">
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F0F1F3]">
            <tr v-for="p in items" :key="p.id" class="hover:bg-[#FAFAFB] transition-colors">
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="font-semibold text-[#101828]">{{ p.title }}</div>
                <div class="font-mono text-[11px] text-[#98A2B3]">{{ p.code }}</div>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="text-[#101828]">{{ p.customerName }}</div>
                <div class="text-[12px] text-[#98A2B3]">{{ p.customerEmail }}</div>
              </td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">
                {{ p.sessionsRemaining ?? '∞' }}<span v-if="p.sessionsTotal" class="text-[#98A2B3]">/{{ p.sessionsTotal }}</span>
              </td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ d(p.validUntil) }}-ig</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ huf(p.purchasePriceGross) }}</td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span :class="statusStyle[p.status] ?? 'bg-[#F2F4F7] text-[#667085]'"
                  class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">{{ p.status }}</span>
              </td>
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <button v-if="p.refundable"
                  class="rounded-lg border border-[#D0D5DD] text-[#B42318] px-3 py-1.5 text-xs font-semibold hover:bg-[#FBE9E9] disabled:opacity-60"
                  :disabled="busy === p.id" @click="refund(p)">
                  {{ busy === p.id ? '…' : 'Visszatérítés' }}
                </button>
              </td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="7" class="py-10 px-4 text-center text-[#667085]">Még nincs eladott bérlet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
