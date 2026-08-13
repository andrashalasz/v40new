<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

interface Appt {
  publicRef: string
  startsAt: string
  status: string
  settlement: string
  priceGross: number
  service: { title: string; slug: string; durationMin: number }
  practitioner: { name: string }
  room: { name: string } | null
}
interface Pass {
  code: string
  sessionsTotal: number | null
  sessionsRemaining: number | null
  validUntil: string
  status: string
  passTemplate: { title: string }
  services: { title: string; slug: string }[]
}

const { data, refresh } = await useFetch<{
  profile: { email: string; firstName: string | null; lastName: string | null; phone: string | null } | null
  upcoming: Appt[]
  past: Appt[]
  passes: Pass[]
}>('/api/me')

const busy = ref('')
const msg = ref('')

async function cancel(ref_: string) {
  busy.value = ref_
  msg.value = ''
  try {
    const res = await $fetch<{ message: string }>('/api/appointments/cancel', {
      method: 'POST',
      body: { publicRef: ref_ },
    })
    msg.value = res.message
    await refresh()
  } catch (e: unknown) {
    msg.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'A lemondás nem sikerült.'
  } finally {
    busy.value = ''
  }
}

const Ft = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'
const dt = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', timeZone: 'Europe/Budapest',
  }).format(new Date(iso))
const d = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeZone: 'Europe/Budapest' }).format(new Date(iso))

const STATUS: Record<string, string> = {
  HOLD: 'fizetésre vár',
  PENDING_PAYMENT: 'fizetésre vár',
  CONFIRMED: 'megerősítve',
  COMPLETED: 'megtörtént',
  NO_SHOW: 'nem jelent meg',
}

useSeoMeta({ title: 'Fiókom | V40 Vital', robots: 'noindex' })
</script>

<template>
  <Header />

  <div class="relative w-full pb-10 pt-12 lg:pt-16 lg:pb-14 lg:px-[100px] bg-[#E5F7F9]">
    <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
      <h1 class="text-[32px] lg:text-[56px] dm-sans font-bold mb-3 text-center text-[#171008]">Fiókom</h1>
      <p class="dm-sans text-[#171008] text-[18px] text-center">
        {{ [data?.profile?.lastName, data?.profile?.firstName].filter(Boolean).join(' ') || data?.profile?.email }}
      </p>
    </div>
  </div>

  <div class="w-full bg-[#F4F4F0] py-10 lg:py-14 lg:px-[100px]">
    <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
      <p v-if="msg" class="mb-5 bg-[#E5F7F9] text-[#153131] rounded-lg p-4 text-[14px] font-semibold">{{ msg }}</p>

      <h2 class="dm-sans font-bold text-[24px] mb-3">Bérleteim</h2>
      <div v-if="data?.passes?.length" class="mb-9">
        <div v-for="p in data.passes" :key="p.code" class="bg-white rounded-lg p-5 lg:p-6 mb-3">
          <div class="flex flex-col lg:flex-row lg:justify-between gap-3">
            <div>
              <h3 class="dm-sans font-bold text-[19px]">{{ p.passTemplate.title }}</h3>
              <p class="text-[#00000080] text-[14px]">
                Kód: <span class="font-mono">{{ p.code }}</span> · érvényes {{ d(p.validUntil) }}-ig
              </p>
              <p class="text-[14px] mt-1.5">
                {{ p.services.map((s) => s.title).join(', ') }}
              </p>
            </div>
            <div class="lg:text-right shrink-0">
              <p class="dm-sans font-bold text-[26px]">
                {{ p.sessionsRemaining ?? '∞' }}<span v-if="p.sessionsTotal" class="text-[#00000080]">/{{ p.sessionsTotal }}</span>
              </p>
              <p class="text-[#00000080] text-[13px]">alkalom</p>
            </div>
          </div>
          <div v-if="p.sessionsTotal" class="h-[7px] bg-[#E4E4DE] rounded-full overflow-hidden mt-3">
            <i class="block h-full bg-[#153131]" :style="{ width: `${((p.sessionsRemaining ?? 0) / p.sessionsTotal) * 100}%` }" />
          </div>
        </div>
      </div>
      <div v-else class="bg-white rounded-lg p-5 text-[#00000080] mb-9">
        Nincs aktív bérleted. <NuxtLink to="/berletek" class="underline text-[#153131]">Bérleteink</NuxtLink>
      </div>

      <h2 class="dm-sans font-bold text-[24px] mb-3">Közelgő foglalásaim</h2>
      <div v-if="data?.upcoming?.length">
        <div v-for="a in data.upcoming" :key="a.publicRef" class="bg-white rounded-lg p-5 lg:p-6 mb-3">
          <div class="flex flex-col lg:flex-row lg:justify-between gap-3">
            <div>
              <h3 class="dm-sans font-bold text-[19px]">{{ a.service.title }}</h3>
              <p class="text-[#00000080] text-[14px]">{{ dt(a.startsAt) }} · {{ a.practitioner.name }}</p>
              <div class="flex flex-wrap gap-2 mt-2">
                <span class="bg-[#2F73F21A] text-[#153131] rounded-sm px-2 py-1 text-[13px] font-mono">{{ a.publicRef }}</span>
                <span class="bg-[#2F73F21A] text-[#153131] rounded-sm px-2 py-1 text-[13px]">{{ STATUS[a.status] ?? a.status }}</span>
                <span class="bg-[#2F73F21A] text-[#153131] rounded-sm px-2 py-1 text-[13px]">
                  {{ a.settlement === 'PASS' ? 'bérletből' : a.settlement === 'ON_SITE' ? 'helyszínen fizet' : 'kártya' }}
                </span>
              </div>
            </div>
            <div class="shrink-0">
              <button
                class="border-2 border-[#153131] text-[#153131] rounded-lg px-6 py-3 font-medium dm-sans disabled:opacity-40"
                :disabled="busy === a.publicRef"
                @click="cancel(a.publicRef)"
              >
                {{ busy === a.publicRef ? 'Lemondás…' : 'Lemondás' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="bg-white rounded-lg p-5 text-[#00000080]">
        Nincs közelgő foglalásod. <NuxtLink to="/kezelesek" class="underline text-[#153131]">Kezeléseink</NuxtLink>
      </div>

      <template v-if="data?.past?.length">
        <h2 class="dm-sans font-bold text-[24px] mt-9 mb-3">Korábbi foglalásaim</h2>
        <div v-for="a in data.past" :key="a.publicRef" class="bg-white rounded-lg p-4 mb-2 flex flex-wrap justify-between gap-3 opacity-70">
          <span class="text-[15px]"><b>{{ a.service.title }}</b> · {{ dt(a.startsAt) }}</span>
          <span class="text-[14px] text-[#00000080]">{{ Ft(a.priceGross) }}</span>
        </div>
      </template>
    </div>
  </div>

  <WFooter />
</template>
