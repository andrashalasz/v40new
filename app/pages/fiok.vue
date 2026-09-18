<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const { t } = await useContent()

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

interface Invoice {
  id: number
  invoiceNumber: string | null
  totalGross: number
  isStorno: boolean
  issuedAt: string | null
  createdAt: string
}

interface Opinion {
  id: number
  documentCode: string
  title: string
  createdAt: string
}
interface Doc {
  id: number
  fileName: string
  mimeType: string | null
  createdAt: string
}

const { data, refresh } = await useFetch<{
  profile: { email: string; firstName: string | null; lastName: string | null; phone: string | null } | null
  upcoming: Appt[]
  past: Appt[]
  passes: Pass[]
  invoices: Invoice[]
  opinions: Opinion[]
  documents: Doc[]
}>('/api/me')

// --- Dokumentum-feltöltés ---
const uploading = ref(false)
const uploadMsg = ref('')
async function uploadDoc(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  uploadMsg.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch('/api/me/documents', { method: 'POST', body: fd })
    uploadMsg.value = t('account.docUploaded', 'Dokumentum feltöltve.')
    await refresh()
  } catch (err: unknown) {
    const e2 = err as { data?: { statusMessage?: string }; statusMessage?: string }
    uploadMsg.value = e2.data?.statusMessage ?? e2.statusMessage ?? t('account.uploadFailed', 'A feltöltés nem sikerült.')
  } finally {
    uploading.value = false
    input.value = ''
    setTimeout(() => (uploadMsg.value = ''), 4000)
  }
}

const { clear, user } = useUserSession()
const isStaff = computed(() => ['ADMIN', 'STAFF'].includes((user.value as { role?: string })?.role ?? ''))
async function logout() {
  await clear()
  await navigateTo('/')
}

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
    msg.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? t('account.cancelFailed','A lemondás nem sikerült.')
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
  HOLD: t('status.pending','fizetésre vár'),
  PENDING_PAYMENT: t('status.pending','fizetésre vár'),
  CONFIRMED: t('status.confirmed','megerősítve'),
  COMPLETED: t('status.completed','megtörtént'),
  NO_SHOW: t('status.noshow','nem jelent meg'),
}

useSeoMeta({ title: () => `${t('nav.account', 'Fiókom')} | V40 Vital`, robots: 'noindex' })
</script>

<template>
  <Header />

  <div class="relative w-full pb-10 pt-12 lg:pt-16 lg:pb-14 lg:px-[100px] bg-[#E5F7F9]">
    <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
      <h1 class="text-[32px] lg:text-[56px] dm-sans font-bold mb-3 text-center text-[#171008]">{{ t('account.title', 'Fiókom') }}</h1>
      <p class="dm-sans text-[#171008] text-[18px] text-center">
        {{ [data?.profile?.lastName, data?.profile?.firstName].filter(Boolean).join(' ') || data?.profile?.email }}
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3 mt-5">
        <NuxtLink
          v-if="isStaff"
          to="/admin"
          class="rounded-lg border-2 border-[#153131] px-6 py-2.5 dm-sans text-[#153131] font-medium hover:bg-[#153131]/5 transition-colors"
        >
          {{ t('account.admin', 'Admin felület') }}
        </NuxtLink>
        <button
          class="rounded-lg bg-[#153131] px-6 py-2.5 dm-sans text-white font-medium hover:bg-[#0f2525] transition-colors"
          @click="logout"
        >
          {{ t('account.logout', 'Kilépés') }}
        </button>
      </div>
    </div>
  </div>

  <div class="w-full bg-[#F4F4F0] py-10 lg:py-14 lg:px-[100px]">
    <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
      <p v-if="msg" class="mb-5 bg-[#E5F7F9] text-[#153131] rounded-lg p-4 text-[14px] font-semibold">{{ msg }}</p>

      <h2 class="dm-sans font-bold text-[24px] mb-3">{{ t('account.passes', 'Bérleteim') }}</h2>
      <div v-if="data?.passes?.length" class="mb-9">
        <div v-for="p in data.passes" :key="p.code" class="bg-white rounded-lg p-5 lg:p-6 mb-3">
          <div class="flex flex-col lg:flex-row lg:justify-between gap-3">
            <div>
              <h3 class="dm-sans font-bold text-[19px]">{{ p.passTemplate.title }}</h3>
              <p class="text-[#00000080] text-[14px]">
                {{ t('account.code','Kód') }}: <span class="font-mono">{{ p.code }}</span> · {{ t('account.validUntil','érvényes') }} {{ d(p.validUntil) }}-ig
              </p>
              <p class="text-[14px] mt-1.5">
                {{ p.services.map((s) => s.title).join(', ') }}
              </p>
            </div>
            <div class="lg:text-right shrink-0">
              <p class="dm-sans font-bold text-[26px]">
                {{ p.sessionsRemaining ?? '∞' }}<span v-if="p.sessionsTotal" class="text-[#00000080]">/{{ p.sessionsTotal }}</span>
              </p>
              <p class="text-[#00000080] text-[13px]">{{ t('account.session', 'alkalom') }}</p>
            </div>
          </div>
          <div v-if="p.sessionsTotal" class="h-[7px] bg-[#E4E4DE] rounded-full overflow-hidden mt-3">
            <i class="block h-full bg-[#153131]" :style="{ width: `${((p.sessionsRemaining ?? 0) / p.sessionsTotal) * 100}%` }" />
          </div>
        </div>
      </div>
      <div v-else class="bg-white rounded-lg p-5 text-[#00000080] mb-9">
        {{ t('account.noPass','Nincs aktív bérleted.') }} <NuxtLink to="/berletek" class="underline text-[#153131]">{{ t('nav.passes','Bérleteink') }}</NuxtLink>
      </div>

      <h2 class="dm-sans font-bold text-[24px] mb-3">{{ t('account.upcoming', 'Közelgő foglalásaim') }}</h2>
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
                  {{ a.settlement === 'PASS' ? t('account.settle.pass','bérletből') : a.settlement === 'ON_SITE' ? t('account.settle.onsite','helyszínen fizet') : t('account.settle.card','kártya') }}
                </span>
              </div>
            </div>
            <div class="shrink-0">
              <button
                class="border-2 border-[#153131] text-[#153131] rounded-lg px-6 py-3 font-medium dm-sans disabled:opacity-40"
                :disabled="busy === a.publicRef"
                @click="cancel(a.publicRef)"
              >
                {{ busy === a.publicRef ? t('account.cancelling','Lemondás…') : t('account.cancel','Lemondás') }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="bg-white rounded-lg p-5 text-[#00000080]">
        {{ t('account.noUpcoming','Nincs közelgő foglalásod.') }} <NuxtLink to="/kezelesek" class="underline text-[#153131]">{{ t('nav.treatments','Kezeléseink') }}</NuxtLink>
      </div>

      <template v-if="data?.past?.length">
        <h2 class="dm-sans font-bold text-[24px] mt-9 mb-3">{{ t('account.past', 'Korábbi foglalásaim') }}</h2>
        <div v-for="a in data.past" :key="a.publicRef" class="bg-white rounded-lg p-4 mb-2 flex flex-wrap justify-between gap-3 opacity-70">
          <span class="text-[15px]"><b>{{ a.service.title }}</b> · {{ dt(a.startsAt) }}</span>
          <span class="text-[14px] text-[#00000080]">{{ Ft(a.priceGross) }}</span>
        </div>
      </template>

      <template v-if="data?.opinions?.length">
        <h2 class="dm-sans font-bold text-[24px] mt-9 mb-3">{{ t('account.opinions', 'Szakvéleményeim') }}</h2>
        <div v-for="o in data.opinions" :key="o.id" class="bg-white rounded-lg p-4 mb-2 flex flex-wrap items-center justify-between gap-3">
          <span class="text-[15px]">
            <b>{{ o.title }}</b>
            <span class="text-[#00000080]"> · {{ d(o.createdAt) }}</span>
            <span class="block font-mono text-[12px] text-[#98A2B3]">{{ o.documentCode }}</span>
          </span>
          <a :href="`/api/opinions/${o.id}/pdf`" target="_blank" rel="noopener"
            class="text-[#153131] underline text-[14px] font-semibold">{{ t('common.download', 'Letöltés') }}</a>
        </div>
      </template>

      <h2 class="dm-sans font-bold text-[24px] mt-9 mb-3">{{ t('account.documents', 'Dokumentumaim') }}</h2>
      <div class="bg-white rounded-lg p-5 mb-3">
        <p class="text-[#00000080] text-[14px] mb-3">
          {{ t('account.docNote','Tölts fel korábbi leletet vagy dokumentumot (PDF vagy kép). A hozzád rendelt orvos látni fogja.') }}
        </p>
        <label class="inline-block bg-[#153131] text-white rounded-lg px-5 py-2.5 text-[14px] font-medium cursor-pointer" :class="uploading ? 'opacity-60 pointer-events-none' : ''">
          {{ uploading ? t('account.uploading','Feltöltés…') : t('account.uploadDoc','Dokumentum feltöltése') }}
          <input type="file" accept="application/pdf,image/*" class="hidden" @change="uploadDoc" />
        </label>
        <span v-if="uploadMsg" class="ml-3 text-[14px] text-[#153131]">{{ uploadMsg }}</span>
        <div v-if="data?.documents?.length" class="mt-4 divide-y divide-[#0000000D]">
          <div v-for="doc in data.documents" :key="doc.id" class="flex items-center justify-between py-2.5">
            <span class="text-[15px]">{{ doc.fileName }} <span class="text-[#00000060] text-[13px]">· {{ d(doc.createdAt) }}</span></span>
            <a :href="`/api/documents/${doc.id}/download`" target="_blank" rel="noopener" class="text-[#153131] underline text-[14px] font-semibold">{{ t('common.open', 'Megnyitás') }}</a>
          </div>
        </div>
      </div>

      <template v-if="data?.invoices?.length">
        <h2 class="dm-sans font-bold text-[24px] mt-9 mb-3">{{ t('account.invoices', 'Számláim') }}</h2>
        <div v-for="inv in data.invoices" :key="inv.id" class="bg-white rounded-lg p-4 mb-2 flex flex-wrap items-center justify-between gap-3">
          <span class="text-[15px]">
            <b class="font-mono">{{ inv.invoiceNumber }}</b>
            <span v-if="inv.isStorno" class="text-[#B42318] ml-1">({{ t('account.storno','sztornó') }})</span>
            <span class="text-[#00000080]"> · {{ d(inv.issuedAt ?? inv.createdAt) }}</span>
          </span>
          <span class="flex items-center gap-4">
            <span class="text-[14px] text-[#00000080]">{{ Ft(inv.totalGross) }}</span>
            <a :href="`/api/invoices/${inv.id}/pdf`" target="_blank" rel="noopener"
              class="text-[#153131] underline text-[14px] font-semibold">{{ t('common.download', 'Letöltés') }}</a>
          </span>
        </div>
      </template>
    </div>
  </div>

  <WFooter />
</template>
