<script setup lang="ts">
/**
 * Azonnali online fizetés a foglaláshoz.
 *
 * Valódi Stripe módban a Payment Element jelenik meg, amely az eszközön
 * elérhető fizetési módokat kínálja: bankkártya, valamint Apple Pay / Google
 * Pay, ha a böngésző támogatja. A kártyaadat közvetlenül a Stripe-hoz megy.
 *
 * Mock módban (nincs kulcs) egy gomb szimulálja a sikeres fizetést.
 */
/**
 * `endpoint` + `payload`: mit hívjunk a fizetés indításához (foglalás vagy
 * bérlet). A véglegesítés mindig a generikus /api/payments/confirm-on megy át a
 * kapott paymentIntentId-vel.
 */
const props = defineProps<{
  endpoint: string
  payload: Record<string, unknown>
}>()
const emit = defineEmits<{ paid: [] }>()
const { t } = await useContent()

type CheckoutResponse = {
  alreadyPaid?: boolean
  mock?: boolean
  paymentIntentId?: string
  clientSecret?: string
  publishableKey?: string | null
  amountGross?: number
  currency?: string
}

const phase = ref<'loading' | 'form' | 'paying' | 'done' | 'error'>('loading')
const errorMsg = ref('')
const checkout = ref<CheckoutResponse | null>(null)
const elHolder = ref<HTMLElement | null>(null)
const expressHolder = ref<HTMLElement | null>(null)
const expressAvailable = ref(false)

let stripe: any = null
let elements: any = null

const huf = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'

async function init() {
  phase.value = 'loading'
  errorMsg.value = ''
  try {
    const res = await $fetch<CheckoutResponse>(props.endpoint, {
      method: 'POST',
      body: props.payload,
    })
    checkout.value = res

    if (res.alreadyPaid) {
      phase.value = 'done'
      emit('paid')
      return
    }

    if (res.publishableKey && res.clientSecret) {
      stripe = await loadStripe(res.publishableKey)
      elements = stripe.elements({ clientSecret: res.clientSecret })
      const paymentElement = elements.create('payment')
      // Express Checkout Element: nagy Apple Pay / Google Pay / Link gomb a
      // tetején. Csak akkor jelenik meg, ha az eszközön elérhető ilyen wallet.
      const expressElement = elements.create('expressCheckout')
      expressElement.on('ready', (ev: { availablePaymentMethods?: unknown }) => {
        expressAvailable.value = Boolean(ev?.availablePaymentMethods)
      })
      expressElement.on('confirm', async () => {
        await finalizePayment()
      })
      phase.value = 'form'
      await nextTick()
      if (expressHolder.value) expressElement.mount(expressHolder.value)
      if (elHolder.value) paymentElement.mount(elHolder.value)
      return
    }

    // Mock mód
    phase.value = 'form'
  } catch (e: unknown) {
    phase.value = 'error'
    errorMsg.value = extractMsg(e)
  }
}

async function pay() {
  await finalizePayment()
}

// Közös véglegesítés: a kártyás „Fizetés" gomb és az Express (Apple/Google Pay)
// is ezt hívja.
async function finalizePayment() {
  phase.value = 'paying'
  errorMsg.value = ''
  try {
    if (stripe && elements) {
      const { error } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
      if (error) throw new Error(error.message ?? t('checkout.failed','A fizetés nem sikerült.'))
    }

    const res = await $fetch<{ status: string }>('/api/payments/confirm', {
      method: 'POST',
      body: { paymentIntentId: checkout.value?.paymentIntentId },
    })

    if (res.status !== 'SUCCEEDED') {
      throw new Error(res.status === 'PENDING'
        ? t('checkout.pending','A fizetés feldolgozás alatt. Kérlek frissíts pár másodperc múlva.')
        : t('checkout.failedRetry','A fizetés nem sikerült. Kérlek próbáld újra.'))
    }

    phase.value = 'done'
    emit('paid')
  } catch (e: unknown) {
    phase.value = 'form'
    errorMsg.value = extractMsg(e)
  }
}

function extractMsg(e: unknown): string {
  const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return err.data?.statusMessage ?? err.statusMessage ?? err.message ?? t('common.errorRetry','Hiba történt. Kérlek próbáld újra.')
}

onMounted(init)
</script>

<template>
  <div class="mt-6 bg-white border border-[#0000001A] rounded-lg p-5 lg:p-6">
    <p class="dm-sans font-semibold text-[16px] text-[#171008] mb-1">{{ t('checkout.title','Fizetés bankkártyával') }}</p>
    <p class="dm-sans text-[#00000080] text-[13px] mb-4">
      {{ t('checkout.lead','A fizetést a Stripe biztonságosan kezeli. Elérhető Apple Pay és Google Pay is, ha az eszközöd támogatja.') }}
    </p>

    <div v-if="phase === 'loading'" class="dm-sans text-[14px] text-[#00000080] py-3">
      {{ t('checkout.preparing','Fizetési űrlap előkészítése…') }}
    </div>

    <div v-else-if="phase === 'done'" class="flex items-center gap-3 bg-[#E5F7F9] text-[#153131] rounded-lg p-4">
      <span class="text-[18px]">✓</span>
      <span class="dm-sans font-medium text-[15px]">{{ t('checkout.success','Sikeres fizetés — a foglalásod megerősítve.') }}</span>
    </div>

    <div v-else-if="phase === 'error'">
      <p class="dm-sans text-[#A6541B] text-[14px] mb-3">{{ errorMsg }}</p>
      <button class="text-[#153131] underline dm-sans text-[14px]" @click="init">{{ t('common.retry','Újrapróbálom') }}</button>
    </div>

    <div v-else>
      <p v-if="errorMsg" class="dm-sans text-[#A6541B] text-[14px] mb-3">{{ errorMsg }}</p>

      <!-- Express Checkout (Apple Pay / Google Pay / Link) – nagy gomb a tetején -->
      <div v-show="checkout?.publishableKey" ref="expressHolder" class="mb-3" />
      <div v-if="expressAvailable" class="flex items-center gap-3 my-4">
        <span class="h-px flex-1 bg-[#0000001A]" />
        <span class="dm-sans text-[12px] text-[#00000060]">{{ t('checkout.orCard','vagy kártyával') }}</span>
        <span class="h-px flex-1 bg-[#0000001A]" />
      </div>

      <!-- Stripe Payment Element (kártya + wallet-ek) ide ágyazódik -->
      <div v-show="checkout?.publishableKey" ref="elHolder" class="mb-4" />

      <p v-if="checkout?.mock" class="dm-sans text-[#00000080] text-[13px] mb-3">
        {{ t('checkout.testMode','Teszt mód: nincs valós terhelés. A gomb sikeres fizetést szimulál.') }}
      </p>

      <button
        class="w-full bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-4 font-medium dm-sans disabled:opacity-60"
        :disabled="phase === 'paying'"
        @click="pay"
      >
        <template v-if="phase === 'paying'">{{ t('checkout.processing','Feldolgozás…') }}</template>
        <template v-else-if="checkout?.amountGross">{{ t('checkout.pay','Fizetés') }} — {{ huf(checkout.amountGross) }}</template>
        <template v-else>{{ t('checkout.pay','Fizetés') }}</template>
      </button>
    </div>
  </div>
</template>
