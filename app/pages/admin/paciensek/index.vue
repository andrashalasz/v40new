<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

/**
 * Pácienslista az orvosi munkához.
 *
 * Az orvos CSAK a hozzárendelt pácienseit látja – a szűrést a szerver végzi
 * (/api/admin/patients), nem ez a felület.
 *
 * Azért van külön ettől a Páciensek (admin) listától, mert más a célja: ott az
 * ügyfélkezelés a szempont, itt az orvosi munka – ki mért adatot, kinek van
 * szakvéleménye, kihez érdemes bemenni.
 */
interface Row {
  id: number
  email: string
  name: string
  birthDate: string | null
  healthMetrics: number
  appointmentCount: number
  opinionCount: number
  documentCount: number
  lastSyncedDay: string | null
}

const { data, status } = await useFetch<{ items: Row[] }>('/api/admin/patients')
const items = computed(() => data.value?.items ?? [])

const d = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeZone: 'Europe/Budapest' }).format(
        new Date(iso),
      )
    : '—'
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="font-bold text-[24px] tracking-tight">Pácienseim</h1>
      <p class="text-[#667085] text-sm mt-0.5">
        A hozzád rendelt páciensek. Az „Egészségügyi adatok" a telefonjukról szinkronizált
        mérések trendjeit mutatja.
      </p>
    </div>

    <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>

    <div
      v-else-if="!items.length"
      class="p-6 rounded-xl border border-[#FEC84B] bg-[#FFFCF5] text-[#B54708] text-sm"
    >
      <strong>Nincs hozzád rendelt páciens.</strong>
      A hozzárendelést az adminisztrátor végzi: Felhasználók → a páciens Adatlapja → orvos
      hozzárendelése. Enélkül – adatvédelmi okból – nem látod a pácienst és az adatait.
    </div>

    <div
      v-else
      class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FAFAFB]">
              <th
                v-for="h in ['Név', 'E-mail', 'Születési dátum', 'Health adat', 'Utolsó mérés', 'Kezelés', 'Szakvélemény', '']"
                :key="h"
                class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] whitespace-nowrap"
              >{{ h }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F0F1F3]">
            <tr v-for="p in items" :key="p.id" class="hover:bg-[#FAFAFB]">
              <td class="py-3 px-4 font-semibold text-[#101828] whitespace-nowrap">{{ p.name }}</td>
              <td class="py-3 px-4 text-[#475467]">{{ p.email }}</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ d(p.birthDate) }}</td>
              <td class="py-3 px-4">
                <span
                  :class="p.healthMetrics ? 'bg-[#E9F3F2] text-[#153131]' : 'bg-[#F2F4F7] text-[#667085]'"
                  class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                >{{ p.healthMetrics ? p.healthMetrics + ' nap' : 'nincs' }}</span>
              </td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ d(p.lastSyncedDay) }}</td>
              <td class="py-3 px-4 text-[#475467]">{{ p.appointmentCount }}</td>
              <td class="py-3 px-4 text-[#475467]">{{ p.opinionCount }}</td>
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <NuxtLink
                  :to="`/admin/paciensek/${p.id}/egeszseg`"
                  class="text-[#153131] font-semibold underline text-xs"
                >Egészségügyi adatok</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
