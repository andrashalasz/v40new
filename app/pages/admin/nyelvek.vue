<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

interface Lang {
  code: string
  name: string
  isDefault: boolean
  isActive: boolean
  translationCount: number
}

const { data, refresh, status } = await useFetch<{ items: Lang[] }>('/api/admin/languages')
const items = computed(() => data.value?.items ?? [])

const form = reactive({ code: '', name: '' })
const creating = ref(false)
const busy = ref('')
const toast = ref('')
const fieldErr = ref<Record<string, string>>({})

function flash(msg: string) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 3000)
}

async function createLang() {
  creating.value = true
  fieldErr.value = {}
  try {
    const res = await $fetch<{ code: string }>('/api/admin/languages', { method: 'POST', body: { ...form } })
    form.code = ''
    form.name = ''
    await refresh()
    flash('Nyelv létrehozva – indítom a fordítást…')
    await translate(res.code)
  } catch (e: unknown) {
    const err = e as { data?: { data?: { fields?: Record<string, string> }; statusMessage?: string } }
    fieldErr.value = err.data?.data?.fields ?? {}
    if (!Object.keys(fieldErr.value).length) flash(err.data?.statusMessage ?? 'A létrehozás nem sikerült.')
  } finally {
    creating.value = false
  }
}

async function translate(code: string) {
  busy.value = code
  try {
    const res = await $fetch<{ mock: boolean; contentBlocks: number; translations: number }>(
      `/api/admin/languages/${code}/translate`,
      { method: 'POST' },
    )
    await refresh()
    flash(
      res.mock
        ? `Kész (MOCK, nincs AI-kulcs): ${res.contentBlocks} szöveg + ${res.translations} mező bemásolva.`
        : `AI-fordítás kész: ${res.contentBlocks} szöveg + ${res.translations} mező lefordítva.`,
    )
  } catch (e: unknown) {
    flash((e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'A fordítás nem sikerült.')
  } finally {
    busy.value = ''
  }
}

async function toggleActive(l: Lang) {
  await $fetch(`/api/admin/languages/${l.code}`, { method: 'PUT', body: { isActive: !l.isActive } })
  await refresh()
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="font-bold text-[24px] tracking-tight">Nyelvek</h1>
      <p class="text-[#667085] text-sm mt-0.5">
        A magyar az alap. Új nyelv felvitelekor az AI első körben lefordítja a tartalmat; utána kézzel finomítható.
      </p>
    </div>

    <!-- Új nyelv -->
    <div class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-5 mb-6">
      <h2 class="font-semibold text-[15px] mb-3">Új nyelv</h2>
      <form class="flex flex-wrap items-end gap-3" @submit.prevent="createLang">
        <div>
          <label class="block text-[13px] font-semibold text-[#344054] mb-1.5">Kód</label>
          <input v-model="form.code" placeholder="pl. fr" maxlength="5"
            class="w-24 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#153131] focus:ring-2 focus:ring-[#153131]/15"
            :class="fieldErr.code ? 'border-[#FDA29B]' : 'border-[#D0D5DD]'" />
        </div>
        <div>
          <label class="block text-[13px] font-semibold text-[#344054] mb-1.5">Megnevezés</label>
          <input v-model="form.name" placeholder="pl. Français"
            class="w-56 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#153131] focus:ring-2 focus:ring-[#153131]/15"
            :class="fieldErr.name ? 'border-[#FDA29B]' : 'border-[#D0D5DD]'" />
        </div>
        <button type="submit" :disabled="creating"
          class="rounded-lg bg-[#153131] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2525] disabled:opacity-40 transition-colors">
          {{ creating ? 'Létrehozás + fordítás…' : 'Hozzáadás és fordítás' }}
        </button>
      </form>
      <p v-if="fieldErr.code" class="text-xs text-[#B42318] font-semibold mt-2">{{ fieldErr.code }}</p>
    </div>

    <!-- Lista -->
    <div class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="bg-[#FAFAFB]">
            <th v-for="h in ['Nyelv', 'Kód', 'Fordítások', 'Állapot', '']" :key="h"
              class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085]">
              {{ h }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#F0F1F3]">
          <tr v-for="l in items" :key="l.code" class="hover:bg-[#FAFAFB] transition-colors">
            <td class="py-3 px-4 font-semibold text-[#101828]">
              {{ l.name }}
              <span v-if="l.isDefault" class="ml-1.5 text-[11px] font-semibold text-[#153131] bg-[#E9F3F2] rounded-full px-2 py-0.5">alap</span>
            </td>
            <td class="py-3 px-4 text-[#475467] font-mono">{{ l.code }}</td>
            <td class="py-3 px-4 text-[#475467]">{{ l.isDefault ? '—' : l.translationCount }}</td>
            <td class="py-3 px-4">
              <span :class="l.isActive ? 'bg-[#E9F3F2] text-[#153131]' : 'bg-[#F2F4F7] text-[#667085]'"
                class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {{ l.isActive ? 'aktív' : 'rejtett' }}
              </span>
            </td>
            <td class="py-2.5 px-4 text-right whitespace-nowrap">
              <button v-if="!l.isDefault"
                class="rounded-lg border border-[#D9DCE1] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors disabled:opacity-40"
                :disabled="busy === l.code" @click="translate(l.code)">
                {{ busy === l.code ? 'Fordítás…' : 'Újrafordítás' }}
              </button>
              <button v-if="!l.isDefault"
                class="ml-1.5 rounded-lg border border-[#D9DCE1] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
                @click="toggleActive(l)">
                {{ l.isActive ? 'Elrejtés' : 'Aktiválás' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Transition name="fade">
      <div v-if="toast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-[#101828] px-5 py-3 text-sm font-semibold text-white shadow-xl max-w-[90vw] text-center">
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
