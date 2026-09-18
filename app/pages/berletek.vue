<script setup lang="ts">
interface Pass {
  id: number
  slug: string
  title: string
  desc: string
  priceGross: number
  vatRate: number
  sessionCount: number | null
  validityDays: number
  transferable: boolean
  listPriceGross: number
  savingGross: number
  services: { title: string; slug: string }[]
}

const { t } = await useContent()
const passLocale = useLocale()
const { data: passes } = await useFetch<Pass[]>('/api/passes', { query: { locale: passLocale } })
const Ft = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'

const { loggedIn } = useUserSession()
const route = useRoute()

// --- Vásárlási modál ---
const buying = ref<Pass | null>(null)
const paid = ref(false)
const showPay = ref(false)
const billing = reactive({ name: '', taxNumber: '', zip: '', city: '', address: '' })

function openBuy(p: Pass) {
  paid.value = false
  showPay.value = false
  Object.assign(billing, { name: '', taxNumber: '', zip: '', city: '', address: '' })
  buying.value = p
}
function closeBuy() {
  buying.value = null
}
const buyPayload = computed(() => ({
  slug: buying.value?.slug,
  billing: {
    name: billing.name || undefined,
    taxNumber: billing.taxNumber || undefined,
    zip: billing.zip || undefined,
    city: billing.city || undefined,
    address: billing.address || undefined,
  },
}))

useSeoMeta({
  title: () => `${t('nav.passes', 'Bérletek')} | V40 Vital`,
  description:
    'Több alkalomra előre, kedvezőbb áron. Bérleteink érvényessége és felhasználási feltételei.',
})
</script>

<template>
  <Header />

  <div class="relative w-full pb-10 pt-12 lg:pt-16 lg:pb-14 lg:px-[100px] bg-[#E5F7F9]">
    <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
      <h1 class="text-[32px] lg:text-[56px] dm-sans font-bold mb-3 text-center text-[#171008]">{{ t('nav.passes', 'Bérletek') }}</h1>
      <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">
        {{ t('passes.lead', 'Több alkalomra előre – kedvezőbb áron, kötött érvényességgel.') }}
      </p>
    </div>
  </div>

  <div class="w-full bg-[#F4F4F0] py-10 lg:py-14 lg:px-[100px]">
    <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
      <div v-for="p in passes" :key="p.id" class="bg-white rounded-lg p-6 lg:p-8 mb-4">
        <div class="flex flex-col lg:flex-row lg:justify-between gap-5">
          <div>
            <h2 class="dm-sans font-bold text-[22px] mb-2">{{ p.title }}</h2>
            <p class="dm-sans text-[#00000080] text-[15px] mb-3">{{ p.desc }}</p>
            <p class="dm-sans text-[15px] mb-3">
              {{ t('passes.usableFor', 'Felhasználható:') }}
              <span v-for="(s, i) in p.services" :key="s.slug">
                <NuxtLink :to="`/szolgaltatas/${s.slug}`" class="underline">{{ s.title }}</NuxtLink>{{ i < p.services.length - 1 ? ', ' : '' }}
              </span>
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="bg-[#2F73F21A] text-[#153131] rounded-sm px-2 py-1 text-[14px]">
                {{ p.sessionCount ? `${p.sessionCount} ${t('passes.sessions', 'alkalom')}` : t('passes.unlimited', 'korlátlan alkalom') }}
              </span>
              <span class="bg-[#2F73F21A] text-[#153131] rounded-sm px-2 py-1 text-[14px]">
                {{ p.validityDays }} {{ t('passes.validity', 'nap érvényesség') }}
              </span>
              <span v-if="p.savingGross > 0" class="bg-[#EFF7F2] text-[#1F6B4A] rounded-sm px-2 py-1 text-[14px] font-bold">
                {{ Ft(p.savingGross) }} {{ t('passes.saving', 'megtakarítás') }}
              </span>
            </div>
          </div>

          <div class="lg:text-right shrink-0">
            <p class="dm-sans font-bold text-[28px]">{{ Ft(p.priceGross) }}</p>
            <p v-if="p.savingGross > 0" class="text-[#00000080] text-[14px] line-through">
              {{ Ft(p.listPriceGross) }}
            </p>
            <p class="text-[#00000080] text-[13px] mt-1">
              {{ p.vatRate ? t('passes.vatIncl', 'bruttó, 27% áfa') : t('passes.vatExempt', 'áfamentes egészségügyi szolgáltatás') }}
            </p>
            <button
              v-if="loggedIn"
              class="inline-block mt-4 bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-[14px] font-medium dm-sans"
              @click="openBuy(p)"
            >
              {{ t('passes.buy', 'Megvásárlom') }}
            </button>
            <NuxtLink
              v-else
              :to="`/belepes?redirect=${encodeURIComponent(route.fullPath)}`"
              class="inline-block mt-4 bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-[14px] font-medium dm-sans"
            >
              {{ t('passes.loginToBuy', 'Belépés a vásárláshoz') }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="bg-[#E5F7F9] text-[#153131] rounded-lg p-5 max-w-[760px] text-[14px]">
        {{ t('passes.info', 'A bérlet a vásárlástól számított érvényességi időn belül használható fel. A fel nem használt alkalmakról és az elállási jogról az ÁSZF rendelkezik. Online vásárlás a bankkártyás fizetés élesítése után lesz elérhető – addig a bérlet a rendelőben vásárolható meg.') }}
      </div>
    </div>
  </div>

  <!-- Vásárlási modál -->
  <div v-if="buying" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" @click.self="closeBuy">
    <div class="w-full max-w-[520px] my-8 rounded-xl bg-white p-6 lg:p-8 shadow-xl">
      <div class="flex justify-between items-start mb-1">
        <h2 class="dm-sans font-bold text-[22px]">{{ buying.title }}</h2>
        <button class="text-[#00000060] text-[22px] leading-none" @click="closeBuy">×</button>
      </div>
      <p class="dm-sans font-bold text-[24px] mb-5">{{ Ft(buying.priceGross) }}</p>

      <template v-if="!paid">
        <p class="dm-sans font-semibold text-[15px] mb-2">{{ t('passes.billing', 'Számlázási adatok') }}</p>
        <p class="dm-sans text-[#00000080] text-[13px] mb-3">
          {{ t('passes.invoiceNote', 'A számlát e-mailben küldjük, és beküldjük a NAV Online Számla rendszerébe.') }}
        </p>
        <div class="grid grid-cols-1 gap-3 mb-5">
          <input v-model="billing.name" type="text" :placeholder="t('passes.ph.name', 'Név / cégnév')"
            class="w-full rounded-lg border border-[#0000001A] px-3 py-2.5 text-[15px] dm-sans focus:border-[#153131] outline-none" />
          <div class="grid grid-cols-3 gap-3">
            <input v-model="billing.zip" type="text" :placeholder="t('passes.ph.zip', 'Irsz.')"
              class="rounded-lg border border-[#0000001A] px-3 py-2.5 text-[15px] dm-sans focus:border-[#153131] outline-none" />
            <input v-model="billing.city" type="text" :placeholder="t('passes.ph.city', 'Város')"
              class="col-span-2 rounded-lg border border-[#0000001A] px-3 py-2.5 text-[15px] dm-sans focus:border-[#153131] outline-none" />
          </div>
          <input v-model="billing.address" type="text" :placeholder="t('passes.ph.address', 'Cím (utca, házszám)')"
            class="w-full rounded-lg border border-[#0000001A] px-3 py-2.5 text-[15px] dm-sans focus:border-[#153131] outline-none" />
          <input v-model="billing.taxNumber" type="text" :placeholder="t('passes.ph.taxNumber', 'Adószám (cégeknek, opcionális)')"
            class="w-full rounded-lg border border-[#0000001A] px-3 py-2.5 text-[15px] dm-sans focus:border-[#153131] outline-none" />
        </div>

        <button
          v-if="!showPay"
          class="w-full bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-4 font-medium dm-sans"
          @click="showPay = true"
        >
          {{ t('passes.toPayment', 'Tovább a fizetéshez') }}
        </button>
        <OnlineCheckout v-else endpoint="/api/passes/checkout" :payload="buyPayload" @paid="paid = true" />
      </template>

      <div v-else class="text-center py-4">
        <p class="text-[40px] mb-2">✓</p>
        <p class="dm-sans font-bold text-[19px] mb-1">{{ t('passes.success', 'Sikeres vásárlás!') }}</p>
        <p class="dm-sans text-[#00000080] text-[15px] mb-5">{{ t('passes.successNote', 'A bérleted aktív, a számlát e-mailben küldjük.') }}</p>
        <div class="flex justify-center gap-3">
          <NuxtLink to="/fiok" class="bg-[#153131] text-[#F4F4F0] rounded-lg px-6 py-3 font-medium dm-sans">{{ t('account.passes', 'Bérleteim') }}</NuxtLink>
          <button class="border-2 border-[#153131] text-[#153131] rounded-lg px-6 py-[10px] font-medium dm-sans" @click="closeBuy">{{ t('common.close', 'Bezárás') }}</button>
        </div>
      </div>
    </div>
  </div>

  <WFooter />
</template>
