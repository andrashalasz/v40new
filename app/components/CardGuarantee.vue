<script setup lang="ts">
/**
 * Kártya-biztosíték a foglaláshoz.
 *
 * A kártyát NEM terheljük meg – csak elmentjük biztosítékként (no-show / késői
 * lemondás esetére). A nyers kártyaadat közvetlenül a Stripe felé megy
 * (Elements), a szerverünkhöz sosem ér el.
 *
 * Két üzemmód:
 *  - Mock (nincs Stripe publishableKey): egy gombbal szimuláljuk a kártya
 *    megadását – fejlesztéshez/teszthez, valódi kulcsok nélkül.
 *  - Valódi Stripe: a Stripe.js-t betöltjük, a kártyamezőt beágyazzuk, és a
 *    SetupIntentet a böngészőben erősítjük meg.
 */
const props = defineProps<{ publicRef: string }>()
const { t } = await useContent()

type SetupResponse = {
  alreadyActive: boolean
  cardBrand?: string | null
  cardLast4?: string | null
  mock?: boolean
  setupIntentId?: string
  clientSecret?: string
  publishableKey?: string | null
}

const phase = ref<'loading' | 'form' | 'saving' | 'done' | 'error'>('loading')
const errorMsg = ref('')
const savedCard = ref<{ brand: string | null; last4: string | null } | null>(null)

const setup = ref<SetupResponse | null>(null)
const cardHolder = ref<HTMLElement | null>(null)

// Stripe futásidejű objektumok (csak valódi módban)
let stripe: any = null
let cardElement: any = null

async function loadStripeJs(pk: string) {
  if ((window as any).Stripe) return (window as any).Stripe(pk)
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://js.stripe.com/v3/'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(t('guarantee.stripeLoadError','A Stripe nem tölthető be.')))
    document.head.appendChild(s)
  })
  return (window as any).Stripe(pk)
}

async function init() {
  phase.value = 'loading'
  errorMsg.value = ''
  try {
    const res = await $fetch<SetupResponse>('/api/payments/guarantee', {
      method: 'POST',
      body: { publicRef: props.publicRef },
    })
    setup.value = res

    if (res.alreadyActive) {
      savedCard.value = { brand: res.cardBrand ?? null, last4: res.cardLast4 ?? null }
      phase.value = 'done'
      return
    }

    // Valódi Stripe: kártyamező beágyazása
    if (res.publishableKey && res.clientSecret) {
      stripe = await loadStripeJs(res.publishableKey)
      const elements = stripe.elements()
      cardElement = elements.create('card', { hidePostalCode: true })
      phase.value = 'form'
      await nextTick()
      if (cardHolder.value) cardElement.mount(cardHolder.value)
      return
    }

    // Mock mód: nincs beágyazott mező, gombbal véglegesíthető
    phase.value = 'form'
  } catch (e: unknown) {
    phase.value = 'error'
    errorMsg.value = extractMsg(e)
  }
}

async function saveCard() {
  phase.value = 'saving'
  errorMsg.value = ''
  try {
    // Valódi Stripe: a SetupIntent megerősítése a böngészőben
    if (stripe && cardElement && setup.value?.clientSecret) {
      const { error } = await stripe.confirmCardSetup(setup.value.clientSecret, {
        payment_method: { card: cardElement },
      })
      if (error) throw new Error(error.message ?? t('guarantee.saveFailed','A kártya rögzítése nem sikerült.'))
    }

    // Mindkét módban: a szerver lekérdezi a végállapotot és elmenti a kártyát
    const confirmed = await $fetch<{ status: string; cardBrand: string | null; cardLast4: string | null }>(
      '/api/payments/guarantee/confirm',
      { method: 'POST', body: { publicRef: props.publicRef } },
    )

    if (confirmed.status !== 'ACTIVE') {
      throw new Error(t('guarantee.notFinished','A kártya rögzítése nem fejeződött be. Kérlek próbáld újra.'))
    }

    savedCard.value = { brand: confirmed.cardBrand, last4: confirmed.cardLast4 }
    phase.value = 'done'
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
  <div class="mt-6 bg-[#F4F4F0] rounded-lg p-5 lg:p-6">
    <div class="flex items-start gap-3 mb-3">
      <span class="text-[22px] leading-none">🔒</span>
      <div>
        <p class="dm-sans font-semibold text-[16px] text-[#171008]">{{ t('guarantee.title','Kártya megadása biztosítékként') }}</p>
        <p class="dm-sans text-[#00000080] text-[13px] mt-1">
          {{ t('guarantee.lead','A kártyát nem terheljük meg – csak biztosítékként rögzítjük meg nem jelenés vagy késői lemondás esetére. Az adatokat a Stripe kezeli, hozzánk nem jutnak el.') }}
        </p>
      </div>
    </div>

    <!-- Betöltés -->
    <div v-if="phase === 'loading'" class="dm-sans text-[14px] text-[#00000080] py-3">
      {{ t('checkout.preparing','Fizetési űrlap előkészítése…') }}
    </div>

    <!-- Kész: mentett kártya -->
    <div
      v-else-if="phase === 'done' && savedCard"
      class="flex items-center gap-3 bg-[#E5F7F9] text-[#153131] rounded-lg p-4"
    >
      <span class="text-[18px]">✓</span>
      <span class="dm-sans font-medium text-[15px]">
        {{ t('guarantee.saved','Kártya rögzítve') }}<span v-if="savedCard.last4">: {{ (savedCard.brand || 'kártya').toUpperCase() }} ···· {{ savedCard.last4 }}</span>
      </span>
    </div>

    <!-- Hiba (indításnál) -->
    <div v-else-if="phase === 'error'">
      <p class="dm-sans text-[#A6541B] text-[14px] mb-3">{{ errorMsg }}</p>
      <button class="text-[#153131] underline dm-sans text-[14px]" @click="init">{{ t('common.retry','Újrapróbálom') }}</button>
    </div>

    <!-- Űrlap (mock gomb VAGY Stripe mező) -->
    <div v-else>
      <p v-if="errorMsg" class="dm-sans text-[#A6541B] text-[14px] mb-3">{{ errorMsg }}</p>

      <!-- Valódi Stripe kártyamező ide ágyazódik -->
      <div
        v-show="setup?.publishableKey"
        ref="cardHolder"
        class="bg-white rounded-lg p-4 border border-[#0000001A] mb-4"
      />

      <!-- Mock mód jelzés -->
      <p v-if="setup?.mock" class="dm-sans text-[#00000080] text-[13px] mb-3">
        {{ t('guarantee.testMode','Teszt mód: nincs valós fizetés. A gomb egy demó Visa ···· 4242 kártyát rögzít.') }}
      </p>

      <button
        class="bg-[#153131] text-[#F4F4F0] rounded-lg px-8 py-3 font-medium dm-sans disabled:opacity-60"
        :disabled="phase === 'saving'"
        @click="saveCard"
      >
        {{ phase === 'saving' ? t('guarantee.saving', 'Rögzítés…') : t('guarantee.save', 'Kártya rögzítése') }}
      </button>
    </div>
  </div>
</template>
