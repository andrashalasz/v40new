<script setup lang="ts">
/** Ügyfél-belépés. Az admin belépő külön van (/admin). */
const route = useRoute()
const { t } = await useContent()
const { fetch: refreshSession, loggedIn } = useUserSession()

const form = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

const safeRedirect = computed(() => {
  const r = route.query.redirect
  return typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/fiok'
})

// Ha már be van lépve, nincs itt dolga.
onMounted(() => {
  if (loggedIn.value) navigateTo(safeRedirect.value)
})

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/login', { method: 'POST', body: { email: form.email, password: form.password } })
    await refreshSession()
    await navigateTo(safeRedirect.value)
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'A belépés nem sikerült.'
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: () => `${t('nav.login', 'Belépés')} | V40 Vital`, robots: 'noindex' })
</script>

<template>
  <Header />
  <div class="w-full bg-[#F4F4F0] min-h-[70vh] py-14 lg:py-20 px-4">
    <div class="w-full max-w-[440px] mx-auto bg-white rounded-2xl p-7 lg:p-9 shadow-sm">
      <h1 class="dm-sans font-bold text-[28px] text-[#171008] mb-1">{{ t('auth.login.title', 'Belépés') }}</h1>
      <p class="dm-sans text-[#00000080] text-[15px] mb-6">{{ t('auth.login.lead', 'Foglalásaid és bérleteid a fiókodban.') }}</p>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div>
          <label class="dm-sans text-[14px] font-semibold text-[#171008] mb-1.5 block">{{ t('auth.email', 'E-mail') }}</label>
          <input v-model="form.email" type="email" required autocomplete="email"
            class="w-full rounded-lg border border-[#DBDBDB] px-4 py-3 dm-sans outline-none focus:border-[#153131] transition-colors" />
        </div>
        <div>
          <label class="dm-sans text-[14px] font-semibold text-[#171008] mb-1.5 block">{{ t('auth.password', 'Jelszó') }}</label>
          <input v-model="form.password" type="password" required autocomplete="current-password"
            class="w-full rounded-lg border border-[#DBDBDB] px-4 py-3 dm-sans outline-none focus:border-[#153131] transition-colors" />
        </div>

        <p v-if="error" class="dm-sans text-[14px] text-[#B3261E] font-medium">{{ error }}</p>

        <button type="submit" :disabled="loading"
          class="w-full bg-[#153131] text-white rounded-lg px-6 py-3.5 dm-sans font-medium disabled:opacity-50 transition-opacity">
          {{ loading ? t('auth.login.loading', 'Belépés…') : t('auth.login.title', 'Belépés') }}
        </button>
      </form>

      <p class="dm-sans text-[15px] text-[#00000080] mt-6 text-center">
        {{ t('auth.noAccount', 'Még nincs fiókod?') }}
        <NuxtLink :to="`/regisztracio?redirect=${encodeURIComponent(safeRedirect)}`" class="text-[#153131] font-semibold underline">
          {{ t('auth.register.cta', 'Regisztrálj') }}
        </NuxtLink>
      </p>
    </div>
  </div>
  <WFooter />
</template>
