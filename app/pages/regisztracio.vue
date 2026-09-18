<script setup lang="ts">
/** Ügyfél-regisztráció (jelszavas). A foglalásból már létező fiókot összefésüli. */
const route = useRoute()
const { t } = await useContent()
const { fetch: refreshSession, loggedIn } = useUserSession()

const form = reactive({
  lastName: '',
  firstName: '',
  email: '',
  phone: '',
  birthDate: '',
  password: '',
  privacyAccepted: false,
  marketingConsent: false,
})
const loading = ref(false)
const error = ref('')
const fieldErrors = ref<Record<string, string>>({})

const safeRedirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/fiok'
})

onMounted(() => {
  if (loggedIn.value) navigateTo(safeRedirect.value)
})

async function submit() {
  loading.value = true
  error.value = ''
  fieldErrors.value = {}
  try {
    await $fetch('/api/register', { method: 'POST', body: { ...form } })
    await refreshSession()
    await navigateTo(safeRedirect.value)
  } catch (e: unknown) {
    const err = e as { data?: { data?: { fields?: Record<string, string> }; statusMessage?: string } }
    fieldErrors.value = err.data?.data?.fields ?? {}
    if (!Object.keys(fieldErrors.value).length) {
      error.value = err.data?.statusMessage ?? 'A regisztráció nem sikerült.'
    }
  } finally {
    loading.value = false
  }
}

const inputBase =
  'w-full rounded-lg border px-4 py-3 dm-sans outline-none focus:border-[#153131] transition-colors'
const cls = (k: string) => `${inputBase} ${fieldErrors.value[k] ? 'border-[#B3261E]' : 'border-[#DBDBDB]'}`

useSeoMeta({ title: () => `${t('nav.register', 'Regisztráció')} | V40 Vital`, robots: 'noindex' })
</script>

<template>
  <Header />
  <div class="w-full bg-[#F4F4F0] min-h-[70vh] py-14 lg:py-20 px-4">
    <div class="w-full max-w-[480px] mx-auto bg-white rounded-2xl p-7 lg:p-9 shadow-sm">
      <h1 class="dm-sans font-bold text-[28px] text-[#171008] mb-1">{{ t('auth.register.title', 'Regisztráció') }}</h1>
      <p class="dm-sans text-[#00000080] text-[15px] mb-6">{{ t('auth.register.lead', 'Hozz létre fiókot a foglalásaid kezeléséhez.') }}</p>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <label class="dm-sans text-[14px] font-semibold text-[#171008] mb-1.5 block">{{ t('auth.lastName', 'Vezetéknév') }}</label>
            <input v-model="form.lastName" type="text" required :class="cls('lastName')" />
          </div>
          <div class="flex-1">
            <label class="dm-sans text-[14px] font-semibold text-[#171008] mb-1.5 block">{{ t('auth.firstName', 'Keresztnév') }}</label>
            <input v-model="form.firstName" type="text" required :class="cls('firstName')" />
          </div>
        </div>
        <div>
          <label class="dm-sans text-[14px] font-semibold text-[#171008] mb-1.5 block">{{ t('auth.email', 'E-mail') }}</label>
          <input v-model="form.email" type="email" required autocomplete="email" :class="cls('email')" />
          <p v-if="fieldErrors.email" class="dm-sans text-[13px] text-[#B3261E] mt-1">{{ fieldErrors.email }}</p>
        </div>
        <div>
          <label class="dm-sans text-[14px] font-semibold text-[#171008] mb-1.5 block">{{ t('auth.phone', 'Telefonszám') }}</label>
          <input v-model="form.phone" type="tel" required :class="cls('phone')" />
        </div>
        <div>
          <label class="dm-sans text-[14px] font-semibold text-[#171008] mb-1.5 block">{{ t('auth.birthDate', 'Születési dátum') }}</label>
          <DatePicker v-model="form.birthDate" :input-class="cls('birthDate')" :placeholder="t('auth.birthDatePick', 'Válassz dátumot')" />
          <p v-if="fieldErrors.birthDate" class="dm-sans text-[13px] text-[#B3261E] mt-1">{{ fieldErrors.birthDate }}</p>
        </div>
        <div>
          <label class="dm-sans text-[14px] font-semibold text-[#171008] mb-1.5 block">{{ t('auth.password', 'Jelszó') }}</label>
          <input v-model="form.password" type="password" required autocomplete="new-password" :class="cls('password')" />
          <p v-if="fieldErrors.password" class="dm-sans text-[13px] text-[#B3261E] mt-1">{{ fieldErrors.password }}</p>
          <p v-else class="dm-sans text-[13px] text-[#00000080] mt-1">{{ t('auth.passwordHint', 'Legalább 8 karakter.') }}</p>
        </div>

        <label class="flex items-start gap-2.5 dm-sans text-[14px] text-[#171008] cursor-pointer">
          <input v-model="form.privacyAccepted" type="checkbox" class="mt-1 accent-[#153131]" required />
          <span>
            {{ t('auth.acceptPrefix', 'Elfogadom az') }}
            <NuxtLink to="/adatvedelmi" target="_blank" class="text-[#153131] underline">{{ t('nav.privacy', 'Adatkezelési tájékoztatót') }}</NuxtLink>.
          </span>
        </label>
        <label class="flex items-start gap-2.5 dm-sans text-[14px] text-[#171008] cursor-pointer">
          <input v-model="form.marketingConsent" type="checkbox" class="mt-1 accent-[#153131]" />
          <span>{{ t('auth.marketing', 'Szeretnék hírlevelet és ajánlatokat kapni (nem kötelező).') }}</span>
        </label>

        <p v-if="error" class="dm-sans text-[14px] text-[#B3261E] font-medium">{{ error }}</p>

        <button type="submit" :disabled="loading"
          class="w-full bg-[#153131] text-white rounded-lg px-6 py-3.5 dm-sans font-medium disabled:opacity-50 transition-opacity">
          {{ loading ? t('auth.register.loading', 'Regisztráció…') : t('auth.register.title', 'Regisztráció') }}
        </button>
      </form>

      <p class="dm-sans text-[15px] text-[#00000080] mt-6 text-center">
        {{ t('auth.haveAccount', 'Van már fiókod?') }}
        <NuxtLink :to="`/belepes?redirect=${encodeURIComponent(safeRedirect)}`" class="text-[#153131] font-semibold underline">
          {{ t('auth.login.cta', 'Lépj be') }}
        </NuxtLink>
      </p>
    </div>
  </div>
  <WFooter />
</template>
