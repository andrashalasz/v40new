<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

interface Guarantee {
  status: 'PENDING' | 'ACTIVE' | 'CHARGED' | 'CANCELLED' | 'FAILED'
  cardBrand: string | null
  cardLast4: string | null
  charged: boolean
}
interface Appt {
  publicRef: string
  startsAt: string
  status: string
  settlement: string
  priceGross: number
  customerName: string
  customerEmail: string
  customerPhone: string | null
  serviceTitle: string
  practitionerName: string
  guarantee: Guarantee | null
}

const { data, status, refresh } = await useFetch<{ items: Appt[] }>('/api/admin/appointments')
const items = computed(() => data.value?.items ?? [])

// A no-show díj alapértelmezett %-a a beállításokból (a terhelés-modál elő­töltéséhez).
const { data: settings } = await useFetch<{ noShowFeePercent: number }>('/api/settings')
const feePercent = computed(() => settings.value?.noShowFeePercent ?? 50)

const dt = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Budapest' }).format(new Date(iso))
const huf = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'

const settlementLabel: Record<string, string> = {
  ONLINE_CARD: 'Bankkártya', PASS: 'Bérlet', ON_SITE: 'Helyszínen',
}
const statusStyle: Record<string, string> = {
  HOLD: 'bg-[#FEF3E7] text-[#B25E09]',
  PENDING_PAYMENT: 'bg-[#FEF3E7] text-[#B25E09]',
  CONFIRMED: 'bg-[#E9F3F2] text-[#153131]',
  COMPLETED: 'bg-[#EAF0FB] text-[#1D4ED8]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
  NO_SHOW: 'bg-[#FBE9E9] text-[#B42318]',
}
const guaranteeStyle: Record<string, string> = {
  ACTIVE: 'bg-[#E9F3F2] text-[#153131]',
  CHARGED: 'bg-[#EAF0FB] text-[#1D4ED8]',
  PENDING: 'bg-[#FEF3E7] text-[#B25E09]',
  FAILED: 'bg-[#FBE9E9] text-[#B42318]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
}

// --- Terhelés modál ---
const chargeTarget = ref<Appt | null>(null)
const chargeAmount = ref<number | null>(null)
const chargeReason = ref('No-show / késői lemondás díja')
const charging = ref(false)
const chargeError = ref('')
const toast = ref('')

function openCharge(a: Appt) {
  chargeTarget.value = a
  chargeAmount.value = Math.round((a.priceGross * feePercent.value) / 100)
  chargeReason.value = 'No-show / késői lemondás díja'
  chargeError.value = ''
}
function closeCharge() {
  chargeTarget.value = null
}

const refunding = ref<string | null>(null)
async function refund(a: Appt) {
  if (!confirm(`Biztosan visszatéríted és lemondod?\n${a.customerName} · ${a.serviceTitle}`)) return
  refunding.value = a.publicRef
  try {
    const res = await $fetch<{ refunded: number; hadPayment: boolean }>(
      `/api/admin/appointments/${a.publicRef}/refund`,
      { method: 'POST', body: { reason: 'Admin visszatérítés' } },
    )
    toast.value = res.hadPayment
      ? `Visszatérítve: ${huf(res.refunded)} – a foglalás lemondva.`
      : 'A foglalás lemondva (nem volt online fizetés).'
    await refresh()
    setTimeout(() => (toast.value = ''), 4000)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    toast.value = err.data?.statusMessage ?? err.statusMessage ?? 'A visszatérítés nem sikerült.'
    setTimeout(() => (toast.value = ''), 5000)
  } finally {
    refunding.value = null
  }
}

async function submitCharge() {
  if (!chargeTarget.value || !chargeAmount.value) return
  charging.value = true
  chargeError.value = ''
  try {
    const res = await $fetch<{ ok: boolean; amountGross: number }>(
      `/api/admin/appointments/${chargeTarget.value.publicRef}/charge-guarantee`,
      { method: 'POST', body: { amountGross: chargeAmount.value, reason: chargeReason.value } },
    )
    toast.value = `Sikeres terhelés: ${huf(res.amountGross)}`
    closeCharge()
    await refresh()
    setTimeout(() => (toast.value = ''), 4000)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    chargeError.value = err.data?.statusMessage ?? err.statusMessage ?? 'A terhelés nem sikerült.'
  } finally {
    charging.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="font-bold text-[24px] tracking-tight">Foglalások</h1>
      <p class="text-[#667085] text-sm mt-0.5">
        Az összes foglalás és a kártya-biztosíték állapota. Aktív biztosítéknál elérhető a no-show terhelés.
      </p>
    </div>

    <div v-if="toast" class="mb-4 rounded-lg bg-[#E9F3F2] text-[#153131] px-4 py-3 text-sm font-semibold">
      {{ toast }}
    </div>

    <div class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FAFAFB]">
              <th v-for="h in ['Időpont', 'Páciens', 'Kezelés', 'Szakember', 'Fizetés', 'Státusz', 'Biztosíték', '']" :key="h"
                class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] whitespace-nowrap">
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F0F1F3]">
            <tr v-for="a in items" :key="a.publicRef" class="hover:bg-[#FAFAFB] transition-colors">
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="font-semibold text-[#101828]">{{ dt(a.startsAt) }}</div>
                <div class="font-mono text-[11px] text-[#98A2B3]">{{ a.publicRef }}</div>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="text-[#101828]">{{ a.customerName }}</div>
                <div class="text-[12px] text-[#98A2B3]">{{ a.customerEmail }}</div>
              </td>
              <td class="py-3 px-4 text-[#475467]">{{ a.serviceTitle }}</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ a.practitionerName }}</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ settlementLabel[a.settlement] ?? a.settlement }}</td>
              <td class="py-3 px-4">
                <span :class="statusStyle[a.status] ?? 'bg-[#F2F4F7] text-[#667085]'"
                  class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap">
                  {{ a.status }}
                </span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span v-if="a.guarantee" :class="guaranteeStyle[a.guarantee.status] ?? 'bg-[#F2F4F7] text-[#667085]'"
                  class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {{ a.guarantee.status }}<template v-if="a.guarantee.cardLast4"> · {{ (a.guarantee.cardBrand || '').toUpperCase() }} ····{{ a.guarantee.cardLast4 }}</template>
                </span>
                <span v-else class="text-[#98A2B3] text-xs">—</span>
              </td>
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <div class="flex justify-end gap-2">
                  <button
                    v-if="a.guarantee && a.guarantee.status === 'ACTIVE'"
                    class="rounded-lg bg-[#153131] text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
                    @click="openCharge(a)"
                  >
                    Terhelés
                  </button>
                  <span v-else-if="a.guarantee && a.guarantee.status === 'CHARGED'" class="text-[#1D4ED8] text-xs font-semibold self-center">Terhelve</span>
                  <button
                    v-if="!['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(a.status)"
                    class="rounded-lg border border-[#D0D5DD] text-[#B42318] px-3 py-1.5 text-xs font-semibold hover:bg-[#FBE9E9] disabled:opacity-60"
                    :disabled="refunding === a.publicRef"
                    @click="refund(a)"
                  >
                    {{ refunding === a.publicRef ? '…' : (a.settlement === 'ONLINE_CARD' ? 'Visszatérítés' : 'Lemondás') }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="8" class="py-10 px-4 text-center text-[#667085]">Még nincs foglalás.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Terhelés modál -->
    <div v-if="chargeTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="closeCharge">
      <div class="w-full max-w-[440px] rounded-xl bg-white p-6 shadow-xl">
        <h2 class="font-bold text-[19px] mb-1">Kártya-biztosíték terhelése</h2>
        <p class="text-[#667085] text-sm mb-4">
          {{ chargeTarget.customerName }} · {{ chargeTarget.serviceTitle }}<br>
          <span v-if="chargeTarget.guarantee?.cardLast4" class="text-[13px]">
            {{ (chargeTarget.guarantee.cardBrand || 'kártya').toUpperCase() }} ···· {{ chargeTarget.guarantee.cardLast4 }}
          </span>
        </p>

        <label class="block text-sm font-semibold text-[#344054] mb-1">Összeg (Ft)</label>
        <input v-model.number="chargeAmount" type="number" min="1"
          class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 mb-3 text-sm focus:border-[#153131] outline-none" />

        <label class="block text-sm font-semibold text-[#344054] mb-1">Indok</label>
        <input v-model="chargeReason" type="text"
          class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 mb-4 text-sm focus:border-[#153131] outline-none" />

        <p v-if="chargeError" class="text-[#B42318] text-sm mb-3">{{ chargeError }}</p>

        <div class="flex justify-end gap-2">
          <button class="rounded-lg px-4 py-2 text-sm font-semibold text-[#475467] hover:bg-[#F2F4F7]" @click="closeCharge">Mégse</button>
          <button
            class="rounded-lg bg-[#153131] text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
            :disabled="charging || !chargeAmount"
            @click="submitCharge"
          >
            {{ charging ? 'Terhelés…' : 'Terhelés indítása' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
