<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

interface Customer {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  registered: boolean
  emailVerified: boolean
  marketingConsent: boolean
  privacyAcceptedAt: string | null
  createdAt: string
  appointmentCount: number
}

const { data, status } = await useFetch<{ items: Customer[] }>('/api/admin/customers')
const items = computed(() => data.value?.items ?? [])

const fullName = (c: Customer) =>
  [c.lastName, c.firstName].filter(Boolean).join(' ') || '—'
const d = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeZone: 'Europe/Budapest' }).format(new Date(iso)) : '—'
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="font-bold text-[24px] tracking-tight">Ügyfelek</h1>
      <p class="text-[#667085] text-sm mt-0.5">
        Regisztrált ügyfelek és a foglalásból létrejött fiókok. A „Regisztrált" jelzi, ki adott meg jelszót.
      </p>
    </div>

    <div class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FAFAFB]">
              <th v-for="h in ['Név', 'E-mail', 'Telefon', 'Foglalás', 'Regisztrált', 'Hírlevél', 'Létrehozva']" :key="h"
                class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] whitespace-nowrap">
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F0F1F3]">
            <tr v-for="c in items" :key="c.id" class="hover:bg-[#FAFAFB] transition-colors">
              <td class="py-3 px-4 font-semibold text-[#101828] whitespace-nowrap">{{ fullName(c) }}</td>
              <td class="py-3 px-4 text-[#475467]">{{ c.email }}</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ c.phone || '—' }}</td>
              <td class="py-3 px-4 text-[#475467]">{{ c.appointmentCount }}</td>
              <td class="py-3 px-4">
                <span :class="c.registered ? 'bg-[#E9F3F2] text-[#153131]' : 'bg-[#F2F4F7] text-[#667085]'"
                  class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {{ c.registered ? 'Igen' : 'Vendég' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <span :class="c.marketingConsent ? 'bg-[#E9F3F2] text-[#153131]' : 'bg-[#F2F4F7] text-[#667085]'"
                  class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {{ c.marketingConsent ? 'Kér' : 'Nem' }}
                </span>
              </td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ d(c.createdAt) }}</td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="7" class="py-10 px-4 text-center text-[#667085]">Még nincs egy ügyfél sem.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
