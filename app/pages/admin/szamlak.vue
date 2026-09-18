<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

interface Invoice {
  id: number
  invoiceNumber: string | null
  provider: string
  totalGross: number
  navStatus: string | null
  pdfUrl: string | null
  isStorno: boolean
  issuedAt: string | null
  createdAt: string
  orderNumber: string
  customerName: string
}

const { data, status, refresh } = await useFetch<{ items: Invoice[] }>('/api/admin/invoices')
const items = computed(() => data.value?.items ?? [])

const huf = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'
const dt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Budapest' }).format(new Date(iso)) : '—'

function navStyle(s: string | null): string {
  if (!s) return 'bg-[#F2F4F7] text-[#667085]'
  if (s.startsWith('ERROR')) return 'bg-[#FBE9E9] text-[#B42318]'
  if (s === 'PENDING') return 'bg-[#FEF3E7] text-[#B25E09]'
  if (s === 'MOCK') return 'bg-[#F2F4F7] text-[#667085]'
  return 'bg-[#E9F3F2] text-[#153131]' // SUBMITTED / OK
}
const isErrored = (s: string | null) => !s || s.startsWith('ERROR') || s === 'PENDING'

const retrying = ref<number | null>(null)
const toast = ref('')

async function retry(inv: Invoice) {
  retrying.value = inv.id
  try {
    const res = await $fetch<{ invoiceNumber: string }>('/api/admin/invoices/retry', {
      method: 'POST', body: { invoiceId: inv.id },
    })
    toast.value = `Számla kiállítva: ${res.invoiceNumber}`
    await refresh()
    setTimeout(() => (toast.value = ''), 4000)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    toast.value = err.data?.statusMessage ?? err.statusMessage ?? 'A kiállítás nem sikerült.'
    setTimeout(() => (toast.value = ''), 5000)
  } finally {
    retrying.value = null
  }
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="font-bold text-[24px] tracking-tight">Számlák</h1>
      <p class="text-[#667085] text-sm mt-0.5">
        Kiállított számlák. A NAV Online Számla beküldést a számlázó szolgáltató (Számlázz.hu) végzi;
        a <b>NAV</b> oszlop az állapotot mutatja. Elakadt számla újrapróbálható.
      </p>
    </div>

    <div v-if="toast" class="mb-4 rounded-lg bg-[#E9F3F2] text-[#153131] px-4 py-3 text-sm font-semibold">{{ toast }}</div>

    <div class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FAFAFB]">
              <th v-for="h in ['Számlaszám', 'Ügyfél', 'Rendelés', 'Összeg', 'Szolgáltató', 'NAV', 'Kiállítva', '']" :key="h"
                class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] whitespace-nowrap">
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F0F1F3]">
            <tr v-for="inv in items" :key="inv.id" class="hover:bg-[#FAFAFB] transition-colors">
              <td class="py-3 px-4 font-mono text-[13px] text-[#101828] whitespace-nowrap">
                {{ inv.invoiceNumber || '—' }}
                <span v-if="inv.isStorno" class="ml-1 text-[#B42318]">(sztornó)</span>
              </td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ inv.customerName }}</td>
              <td class="py-3 px-4 font-mono text-[12px] text-[#98A2B3] whitespace-nowrap">{{ inv.orderNumber }}</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ huf(inv.totalGross) }}</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ inv.provider }}</td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span :class="navStyle(inv.navStatus)" class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {{ inv.navStatus || '—' }}
                </span>
              </td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ dt(inv.issuedAt ?? inv.createdAt) }}</td>
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <a v-if="inv.invoiceNumber" :href="`/api/invoices/${inv.id}/pdf`" target="_blank" rel="noopener"
                  class="text-[#153131] underline text-xs font-semibold mr-3">PDF</a>
                <button v-if="isErrored(inv.navStatus)"
                  class="rounded-lg bg-[#153131] text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  :disabled="retrying === inv.id" @click="retry(inv)">
                  {{ retrying === inv.id ? '…' : 'Újra' }}
                </button>
              </td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="8" class="py-10 px-4 text-center text-[#667085]">Még nincs kiállított számla.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
