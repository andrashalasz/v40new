<script setup lang="ts">
/**
 * Foglalási folyamat.
 *
 * Háromlépéses: időpont -> adatok -> megerősítés. Az idősávokat a
 * /api/availability adja (a tesztelt motorból), a foglalást a
 * /api/appointments/hold hozza létre tranzakciós zárolással.
 *
 * A kliens SOHA nem dönt arról, hogy egy idősáv szabad-e: csak azt kínálja fel,
 * amit a szerver visszaadott, és a szerver a létrehozáskor újra ellenőrzi.
 */
const route = useRoute()
const locale = useLocale()
const { t } = await useContent()
const slug = computed(() => String(route.params.slug))

const { data: svcData, error: svcError } = await useFetch<{
  product: {
    id: number
    slug: string
    title: string
    desc: string
    type: string | null
    price: number
    time: number
    vatRate: number
  }
}>(() => `/api/products?slug=${slug.value}&locale=${locale.value}`)

const service = computed(() => svcData.value?.product)

// --- állapot ---------------------------------------------------------------
// Fizetési beállítások (adminból): online fizetés / kártya-biztosíték elérhető-e.
const { data: siteSettings } = await useFetch<{ onlinePaymentEnabled: boolean; cardGuaranteeEnabled: boolean }>('/api/settings')
const onlinePaymentEnabled = computed(() => siteSettings.value?.onlinePaymentEnabled ?? true)
const cardGuaranteeEnabled = computed(() => siteSettings.value?.cardGuaranteeEnabled ?? true)

const settlementOptions = computed(() => {
  const opts = [
    { v: 'ON_SITE', t: t('booking.opt.onsite.t', 'Fizetés a helyszínen'), d: t('booking.opt.onsite.d', 'Készpénz vagy bankkártya a rendelőben. Az időpont azonnal megerősítésre kerül.') },
    { v: 'PASS', t: t('booking.opt.pass.t', 'Bérletből levonás'), d: t('booking.opt.pass.d', 'Ha van érvényes bérleted erre a kezelésre, a rendszer levon egy alkalmat.') },
  ]
  if (onlinePaymentEnabled.value) {
    opts.push({ v: 'ONLINE_CARD', t: t('booking.opt.card.t', 'Bankkártyás fizetés'), d: t('booking.opt.card.d', 'Fizetés bankkártyával, Apple Pay-jel vagy Google Pay-jel. A foglalás a sikeres fizetéssel véglegesül.') })
  }
  return opts
})

const step = ref<1 | 2 | 3>(1)
const practitionerId = ref<number | null>(null)
const dayOffset = ref<number | null>(null)
const chosenStart = ref<string | null>(null)
const settlement = ref<'ONLINE_CARD' | 'PASS' | 'ON_SITE' | null>(null)
const terms = ref(false)
const submitting = ref(false)
const errorMsg = ref('')
const result = ref<{
  publicRef: string
  startsAt: string
  settlement: string
  needsPayment: boolean
} | null>(null)

const form = reactive({ lastName: '', firstName: '', email: '', phone: '', note: '' })

const { user } = useUserSession()

// --- naptár ----------------------------------------------------------------
const DAYS = ['Vas', 'Hét', 'Ke', 'Sze', 'Csü', 'Pén', 'Szo']
const MONTHS = ['jan', 'feb', 'márc', 'ápr', 'máj', 'jún', 'júl', 'aug', 'szep', 'okt', 'nov', 'dec']
const HORIZON = 21

const dayList = computed(() =>
  Array.from({ length: HORIZON }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return { offset: i, date: d, dow: DAYS[d.getDay()], num: d.getDate(), mon: MONTHS[d.getMonth()] }
  }),
)

const range = computed(() => {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(to.getDate() + HORIZON)
  return { from: from.toISOString(), to: to.toISOString() }
})

interface Slot { start: string; end: string; roomId: number | null }
interface Avail {
  holdMinutes: number
  priceGross: number
  practitioners: { practitionerId: number; practitionerName: string; slots: Slot[] }[]
  reason?: string
}

// Egyetlen lekérés: korábban tévedésből két külön useFetch hívta ugyanezt az
// endpointot, ami dupla kérést és két, egymástól független állapotot adott.
const {
  data: avail,
  status: availStatus,
  refresh: refreshAvail,
} = await useFetch<Avail>('/api/availability', {
  key: 'availability',
  query: computed(() => ({
    serviceId: service.value?.id,
    from: range.value.from,
    to: range.value.to,
  })),
  // A kezelés id-je kell hozzá, ezért csak akkor indul, ha az már megvan
  immediate: Boolean(service.value),
  watch: [service],
})

const practitioners = computed(() => avail.value?.practitioners ?? [])

/** Egy szakember adott napi, még szabad idősávjai. */
function slotsFor(pid: number, offset: number): Slot[] {
  const p = practitioners.value.find((x) => x.practitionerId === pid)
  if (!p) return []
  const d = dayList.value.find((x) => x.offset === offset)!.date
  const next = new Date(d)
  next.setDate(next.getDate() + 1)
  return p.slots.filter((s) => {
    const t = new Date(s.start).getTime()
    return t >= d.getTime() && t < next.getTime()
  })
}

const hasAnySlot = (offset: number) =>
  practitionerId.value ? slotsFor(practitionerId.value, offset).length > 0 : false

const daySlots = computed(() =>
  practitionerId.value !== null && dayOffset.value !== null
    ? slotsFor(practitionerId.value, dayOffset.value)
    : [],
)

const hhmm = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Budapest',
  }).format(new Date(iso))

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Europe/Budapest',
  }).format(new Date(iso))

const Ft = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'

// --- lépésváltás -----------------------------------------------------------
function pickPractitioner(id: number) {
  practitionerId.value = id
  dayOffset.value = null
  chosenStart.value = null
}
function pickDay(o: number) {
  dayOffset.value = o
  chosenStart.value = null
}

function toStep2() {
  if (!chosenStart.value) return
  errorMsg.value = ''
  step.value = 2
}

function toStep3() {
  errorMsg.value = ''
  if (!form.lastName || !form.firstName || !form.email || !form.phone) {
    errorMsg.value = t('booking.err.required', 'A név, e-mail és telefonszám megadása kötelező.')
    return
  }
  step.value = 3
}

async function submit() {
  if (!settlement.value || !terms.value || !service.value || !chosenStart.value) return
  submitting.value = true
  errorMsg.value = ''
  try {
    result.value = await $fetch<{
      publicRef: string
      startsAt: string
      settlement: string
      needsPayment: boolean
    }>('/api/appointments/hold', {
      method: 'POST',
      body: {
        serviceId: service.value.id,
        practitionerId: practitionerId.value,
        startsAt: chosenStart.value,
        settlement: settlement.value,
        note: form.note || undefined,
        customer: user.value
          ? undefined
          : {
              lastName: form.lastName,
              firstName: form.firstName,
              email: form.email,
              phone: form.phone,
            },
      },
    })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMsg.value =
      err.data?.statusMessage ?? err.statusMessage ?? t('booking.err.failed', 'A foglalás nem sikerült. Kérlek próbáld újra.')
    // Ha az idősáv közben elkelt, újratöltjük a naptárat, hogy ne kínáljuk fel újra.
    await refreshAvail()
    chosenStart.value = null
    step.value = 1
  } finally {
    submitting.value = false
  }
}

const chosenPractitioner = computed(
  () => practitioners.value.find((p) => p.practitionerId === practitionerId.value)?.practitionerName ?? '—',
)

useSeoMeta({
  title: () => (service.value ? `${service.value.title} – időpontfoglalás | V40 Vital` : 'Időpontfoglalás | V40 Vital'),
  robots: 'noindex',
})
</script>

<template>
  <Header />

  <div class="relative w-full pb-10 pt-12 lg:pt-16 lg:pb-14 lg:px-[100px] bg-[#E5F7F9]">
    <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
      <h1 class="text-[32px] lg:text-[56px] dm-sans font-bold mb-3 text-center text-[#171008]">
        {{ t('common.book', 'Időpontfoglalás') }}
      </h1>
      <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">
        {{ service?.title ?? t('booking.treatment', 'Kezelés') }}
      </p>
    </div>
  </div>

  <div class="w-full bg-[#F4F4F0] py-10 lg:py-14 lg:px-[100px]">
    <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
      <div v-if="svcError" class="bg-white rounded-lg p-8 text-center">
        <p class="dm-sans text-[18px]">{{ t('booking.unavailable', 'Ez a kezelés nem elérhető.') }}</p>
        <NuxtLink to="/kezelesek" class="inline-block mt-4 bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-4 font-medium">
          {{ t('booking.backToTreatments', 'Vissza a kezelésekhez') }}
        </NuxtLink>
      </div>

      <!-- ---------------- visszaigazolás ---------------- -->
      <div v-else-if="result" class="bg-white rounded-lg p-6 lg:p-10 max-w-[640px] mx-auto">
        <h2 class="dm-sans font-bold text-[26px] mb-2">
          {{ result.needsPayment ? t('booking.held', 'Az időpontot fenntartottuk') : t('booking.confirmed', 'Foglalás megerősítve') }}
        </h2>
        <p class="dm-sans text-[#00000080] mb-6">
          {{ result.needsPayment
            ? t('booking.heldNote', 'A fizetés befejezéséig tartjuk az idősávot.')
            : t('booking.confirmedNote', 'Visszaigazolást küldtünk e-mailben.') }}
        </p>

        <div class="flex justify-between py-2 border-b border-dashed border-[#0000001A] text-[15px]">
          <span>{{ t('booking.ref', 'Azonosító') }}</span><b class="font-mono">{{ result.publicRef }}</b>
        </div>
        <div class="flex justify-between py-2 border-b border-dashed border-[#0000001A] text-[15px]">
          <span>{{ t('booking.summary.treatment', 'Kezelés') }}</span><b>{{ service?.title }}</b>
        </div>
        <div class="flex justify-between py-2 border-b border-dashed border-[#0000001A] text-[15px]">
          <span>{{ t('booking.summary.practitioner', 'Szakember') }}</span><b>{{ chosenPractitioner }}</b>
        </div>
        <div class="flex justify-between py-2 border-b border-dashed border-[#0000001A] text-[15px]">
          <span>{{ t('booking.summary.time', 'Időpont') }}</span><b>{{ longDate(result.startsAt) }}, {{ hhmm(result.startsAt) }}</b>
        </div>
        <div class="flex justify-between py-2 text-[15px]">
          <span>{{ t('booking.summary.payment', 'Fizetés') }}</span>
          <b>{{ result.settlement === 'PASS' ? t('booking.pay.pass', 'bérletből levonva')
            : result.settlement === 'ON_SITE' ? t('booking.pay.onsite', 'helyszínen') : t('booking.pay.card', 'bankkártya') }}</b>
        </div>

        <!-- Online kártyás fizetésnél a kezelés árát azonnal fizeti (Apple/Google
             Pay is), helyszíni fizetésnél a kártyát csak biztosítékként kérjük. -->
        <OnlineCheckout
          v-if="result.settlement === 'ONLINE_CARD'"
          endpoint="/api/payments/checkout"
          :payload="{ publicRef: result.publicRef }"
        />
        <CardGuarantee
          v-else-if="result.settlement === 'ON_SITE' && cardGuaranteeEnabled"
          :public-ref="result.publicRef"
        />

        <div class="mt-7 flex flex-wrap gap-3">
          <NuxtLink to="/fiok" class="bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-4 font-medium dm-sans">
            {{ t('booking.myBookings', 'Foglalásaim') }}
          </NuxtLink>
          <NuxtLink to="/kezelesek" class="border-2 border-[#153131] text-[#153131] rounded-lg px-8 py-[14px] font-medium dm-sans">
            {{ t('booking.moreTreatments', 'További kezelések') }}
          </NuxtLink>
        </div>
      </div>

      <!-- ---------------- folyamat ---------------- -->
      <template v-else>
        <div class="flex flex-wrap gap-2 mb-7">
          <div
            v-for="(label, i) in [t('booking.step.time', 'Időpont'), t('booking.step.data', 'Adatok'), t('booking.step.confirm', 'Megerősítés')]"
            :key="i"
            class="text-[13px] font-semibold rounded-full px-4 py-2 border"
            :class="step === i + 1
              ? 'bg-[#153131] border-[#153131] text-white'
              : step > i + 1
                ? 'bg-[#E5F7F9] border-[#E5F7F9] text-[#153131]'
                : 'bg-white border-[#0000001A] text-[#00000080]'"
          >
            {{ i + 1 }}. {{ label }}
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
          <div class="bg-white rounded-lg p-5 lg:p-8">
            <p v-if="errorMsg" class="mb-5 bg-[#FDF3EA] text-[#A6541B] rounded-lg p-4 text-[14px] font-semibold">
              {{ errorMsg }}
            </p>

            <!-- 1. lépés -->
            <template v-if="step === 1">
              <h3 class="dm-sans font-bold text-[20px] mb-3">{{ t('booking.summary.practitioner', 'Szakember') }}</h3>
              <p v-if="availStatus === 'pending'" class="text-[#00000080]">{{ t('booking.loadingSlots', 'Szabad időpontok betöltése…') }}</p>
              <p v-else-if="!practitioners.length" class="text-[#00000080]">
                {{ avail?.reason ?? t('booking.noPractitioner', 'Ehhez a kezeléshez jelenleg nincs elérhető szakember.') }}
              </p>
              <div v-else class="flex flex-wrap gap-2">
                <button
                  v-for="p in practitioners"
                  :key="p.practitionerId"
                  class="rounded-full px-4 py-2 text-[14px] border"
                  :class="p.practitionerId === practitionerId
                    ? 'bg-[#153131] border-[#153131] text-white font-semibold'
                    : 'bg-white border-[#0000001A] text-[#00000080]'"
                  @click="pickPractitioner(p.practitionerId)"
                >
                  {{ p.practitionerName }}
                </button>
              </div>

              <template v-if="practitionerId !== null">
                <h3 class="dm-sans font-bold text-[20px] mt-8 mb-3">{{ t('booking.day', 'Nap') }}</h3>
                <div class="flex gap-2 overflow-x-auto pb-2">
                  <button
                    v-for="d in dayList"
                    :key="d.offset"
                    class="shrink-0 w-[74px] rounded-lg border py-2.5 text-center"
                    :class="[
                      d.offset === dayOffset ? 'bg-[#153131] border-[#153131] text-white' : 'bg-white border-[#0000001A]',
                      hasAnySlot(d.offset) ? '' : 'opacity-40 cursor-not-allowed',
                    ]"
                    :disabled="!hasAnySlot(d.offset)"
                    @click="pickDay(d.offset)"
                  >
                    <small class="block text-[11px] uppercase tracking-wide"
                      :class="d.offset === dayOffset ? 'text-white/70' : 'text-[#00000080]'">{{ d.dow }}</small>
                    <b class="dm-sans text-[19px]">{{ d.num }}</b>
                    <span class="block text-[11px]"
                      :class="d.offset === dayOffset ? 'text-white/70' : 'text-[#00000080]'">{{ d.mon }}</span>
                  </button>
                </div>

                <template v-if="dayOffset !== null">
                  <h3 class="dm-sans font-bold text-[20px] mt-6 mb-3">{{ t('booking.summary.time', 'Időpont') }}</h3>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="s in daySlots"
                      :key="s.start"
                      class="rounded-lg border px-4 py-3 min-w-[80px] font-semibold"
                      :class="s.start === chosenStart
                        ? 'bg-[#153131] border-[#153131] text-white'
                        : 'bg-white border-[#0000001A]'"
                      @click="chosenStart = s.start"
                    >
                      {{ hhmm(s.start) }}
                    </button>
                  </div>
                  <p class="text-[#00000080] text-[14px] mt-4">
                    {{ t('booking.durationPre', 'A kezelés') }} {{ service?.time }} {{ t('common.min', 'perc') }}. {{ t('booking.slotNote', 'A megjelenő időpontok már tartalmazzák az előkészítési időt.') }}
                  </p>
                </template>
              </template>

              <div class="mt-8">
                <button
                  class="bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-4 font-medium dm-sans disabled:opacity-40"
                  :disabled="!chosenStart"
                  @click="toStep2"
                >
                  {{ t('booking.toData', 'Tovább az adatokhoz') }}
                </button>
              </div>
            </template>

            <!-- 2. lépés -->
            <template v-else-if="step === 2">
              <h3 class="dm-sans font-bold text-[20px] mb-4">{{ t('booking.yourData', 'Adataid') }}</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[13px] font-bold mb-1.5">{{ t('auth.lastName', 'Vezetéknév') }} *</label>
                  <input v-model="form.lastName" type="text" class="w-full border border-[#0000001A] rounded-lg px-3 py-3" />
                </div>
                <div>
                  <label class="block text-[13px] font-bold mb-1.5">{{ t('auth.firstName', 'Keresztnév') }} *</label>
                  <input v-model="form.firstName" type="text" class="w-full border border-[#0000001A] rounded-lg px-3 py-3" />
                </div>
              </div>
              <div class="mt-4">
                <label class="block text-[13px] font-bold mb-1.5">{{ t('auth.email', 'E-mail') }} *</label>
                <input v-model="form.email" type="email" class="w-full border border-[#0000001A] rounded-lg px-3 py-3" />
                <p class="text-[12px] text-[#00000080] mt-1.5">
                  {{ t('booking.emailNote', 'Ide küldjük a visszaigazolást és a belépő linket – nem kell jelszót kitalálnod.') }}
                </p>
              </div>
              <div class="mt-4">
                <label class="block text-[13px] font-bold mb-1.5">{{ t('auth.phone', 'Telefonszám') }} *</label>
                <input v-model="form.phone" type="tel" class="w-full border border-[#0000001A] rounded-lg px-3 py-3" />
              </div>
              <div class="mt-4">
                <label class="block text-[13px] font-bold mb-1.5">{{ t('booking.note', 'Megjegyzés a rendelőnek') }}</label>
                <textarea v-model="form.note" rows="3" class="w-full border border-[#0000001A] rounded-lg px-3 py-3" />
              </div>

              <div class="mt-6 flex flex-wrap gap-3">
                <button class="bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-4 font-medium dm-sans" @click="toStep3">
                  {{ t('common.next', 'Tovább') }}
                </button>
                <button class="text-[#00000080] underline py-4" @click="step = 1">{{ t('common.back', 'Vissza') }}</button>
              </div>
            </template>

            <!-- 3. lépés -->
            <template v-else>
              <h3 class="dm-sans font-bold text-[20px] mb-4">{{ t('booking.paymentMethod', 'Fizetési mód') }}</h3>

              <label
                v-for="opt in settlementOptions"
                :key="opt.v"
                class="flex gap-3 items-start bg-white border-2 rounded-lg p-4 mb-3 cursor-pointer"
                :class="settlement === opt.v ? 'border-[#153131]' : 'border-[#0000001A]'"
              >
                <input v-model="settlement" type="radio" :value="opt.v" class="mt-1 w-[17px] h-[17px] accent-[#153131]" />
                <span>
                  <b class="block text-[15px]">{{ opt.t }}</b>
                  <span class="text-[#00000080] text-[13.5px]">{{ opt.d }}</span>
                </span>
              </label>

              <label class="flex gap-3 items-start my-5 text-[14px] cursor-pointer">
                <input v-model="terms" type="checkbox" class="mt-1 w-[17px] h-[17px] accent-[#153131]" />
                <span>
                  {{ t('booking.acceptPrefix', 'Elfogadom az') }} <NuxtLink to="/aszf" class="underline">{{ t('nav.terms', 'ÁSZF') }}</NuxtLink>{{ t('booking.acceptAnd', '-et és az') }}
                  <NuxtLink to="/adatvedelmi" class="underline">{{ t('nav.privacy', 'Adatkezelési tájékoztatót') }}</NuxtLink>.
                </span>
              </label>

              <div class="flex flex-wrap gap-3">
                <button
                  class="bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-4 font-medium dm-sans disabled:opacity-40"
                  :disabled="!settlement || !terms || submitting"
                  @click="submit"
                >
                  {{ submitting ? t('booking.submitting', 'Foglalás…') : t('booking.confirm', 'Foglalás megerősítése') }}
                </button>
                <button class="text-[#00000080] underline py-4" @click="step = 2">{{ t('common.back', 'Vissza') }}</button>
              </div>
            </template>
          </div>

          <!-- összegző -->
          <div class="bg-white rounded-lg p-5 lg:sticky lg:top-6">
            <h4 class="dm-sans font-bold text-[16px] mb-4">{{ t('booking.summaryTitle', 'Összegzés') }}</h4>
            <div class="flex justify-between gap-3 py-2 border-b border-dashed border-[#0000001A] text-[14px]">
              <span>{{ t('booking.summary.treatment', 'Kezelés') }}</span><b class="text-right">{{ service?.title }}</b>
            </div>
            <div class="flex justify-between gap-3 py-2 border-b border-dashed border-[#0000001A] text-[14px]">
              <span>{{ t('booking.summary.practitioner', 'Szakember') }}</span><b class="text-right">{{ chosenPractitioner }}</b>
            </div>
            <div class="flex justify-between gap-3 py-2 border-b border-dashed border-[#0000001A] text-[14px]">
              <span>{{ t('booking.summary.time', 'Időpont') }}</span>
              <b class="text-right">{{ chosenStart ? `${longDate(chosenStart)}, ${hhmm(chosenStart)}` : '—' }}</b>
            </div>
            <div class="flex justify-between gap-3 py-2 border-b border-dashed border-[#0000001A] text-[14px]">
              <span>{{ t('booking.summary.duration', 'Időtartam') }}</span><b>{{ service?.time }} {{ t('common.min', 'perc') }}</b>
            </div>
            <div class="flex justify-between gap-3 py-2 text-[14px]">
              <span>{{ t('booking.summary.vat', 'Áfa') }}</span><b>{{ service?.vatRate ? '27%' : t('booking.vatExempt', 'áfamentes') }}</b>
            </div>
            <div class="flex justify-between mt-3 pt-3 border-t-2 border-[#171008] dm-sans font-bold text-[19px]">
              <span>{{ t('booking.summary.total', 'Fizetendő') }}</span>
              <span>{{ settlement === 'PASS' ? t('booking.oneSession', '1 alkalom') : Ft(service?.price ?? 0) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <WFooter />
</template>
