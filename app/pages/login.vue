<script setup>
const router = useRouter()
const { fetch: refreshSession } = useUserSession()
const credentials = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
    loading.value = true
    error.value = ''

    try {
        await $fetch('/api/login', {
            method: 'POST',
            body: credentials
        })
        // Sikeres belépés után irány az admin főoldal
        await refreshSession()
        router.push('/admin')
    } catch (err) {
        error.value = err.data?.statusMessage || 'Hiba történt a bejelentkezés során.'
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div class="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
            <h2 class="text-2xl font-bold text-center text-gray-800 mb-8">Admin Belépés</h2>

            <form @submit.prevent="handleLogin" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700">E-mail cím</label>
                    <input v-model="credentials.email" type="email" required
                        class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="admin@admin.com">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700">Jelszó</label>
                    <input v-model="credentials.password" type="password" required
                        class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                </div>

                <p v-if="error" class="text-red-500 text-sm font-medium text-center">{{ error }}</p>

                <button type="submit" :disabled="loading"
                    class="w-full bg-black text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:opacity-50">
                    {{ loading ? 'Bejelentkezés...' : 'Belépés' }}
                </button>
            </form>
        </div>
    </div>
</template>