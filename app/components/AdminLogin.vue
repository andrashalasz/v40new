<script setup lang="ts">
/**
 * Admin belépő űrlap, közvetlenül a /admin oldalon. Nincs külön /login lépés:
 * sikeres belépés után a munkamenet frissül, a `user` reaktívan megjelenik, és
 * az oldal magától a vezérlőpultra vált (nincs átirányítás).
 */
const { fetch: refreshSession, user } = useUserSession()
const credentials = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/login', { method: 'POST', body: credentials })
    await refreshSession()
    // Orvost a saját munkafelületére visszük; a staff a vezérlőpulton marad.
    if ((user.value as { role?: string })?.role === 'DOCTOR') {
      await navigateTo('/admin/szakvelemenyek')
    }
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    error.value = e.data?.statusMessage || 'Hibás e-mail vagy jelszó.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#F7F8FA] p-6">
    <div class="w-full max-w-[400px] rounded-2xl border border-[#ECEDEF] bg-white shadow-[0_4px_24px_rgba(16,24,40,0.06)] p-8">
      <div class="flex items-center gap-2 mb-6">
        <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#153131] text-white text-[14px] font-bold">V4</span>
        <span class="font-bold text-[18px] tracking-tight">V40 Vital — Admin</span>
      </div>
      <h1 class="font-bold text-[20px] mb-1">Belépés</h1>
      <p class="text-[#667085] text-sm mb-6">Jelentkezz be az adminisztrációs felülethez.</p>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="block text-sm font-medium text-[#344054] mb-1">E-mail cím</label>
          <input v-model="credentials.email" type="email" required autocomplete="username"
            class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm focus:border-[#153131] outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-[#344054] mb-1">Jelszó</label>
          <input v-model="credentials.password" type="password" required autocomplete="current-password"
            class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm focus:border-[#153131] outline-none" />
        </div>
        <p v-if="error" class="text-[#B42318] text-sm font-medium">{{ error }}</p>
        <button type="submit" :disabled="loading"
          class="w-full rounded-lg bg-[#153131] text-white font-semibold py-2.5 text-sm disabled:opacity-60">
          {{ loading ? 'Bejelentkezés…' : 'Belépés' }}
        </button>
      </form>
    </div>
  </div>
</template>
