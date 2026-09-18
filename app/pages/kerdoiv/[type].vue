<script setup lang="ts">
interface Q { id: string; label: string; type: 'radio' | 'multicheck' | 'text'; options?: string[]; hasNote?: boolean }
interface Section { title: string; questions: Q[] }
interface Def { type: string; title: string; lead: string; sections: Section[] }

const route = useRoute()
const type = computed(() => String(route.params.type))
const { user } = useUserSession()
const locale = useLocale()
const { t } = await useContent()

const { data: def, error } = await useFetch<Def>(() => `/api/questionnaire/${type.value}`, {
  query: { locale },
})

const answers = reactive<Record<string, unknown>>({})
const contact = reactive({ name: '', email: '' })
const submitting = ref(false)
const done = ref(false)
const errorMsg = ref('')

function toggleCheck(qid: string, opt: string) {
  const arr = (answers[qid] as string[]) ?? []
  answers[qid] = arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]
}

async function submit() {
  submitting.value = true
  errorMsg.value = ''
  try {
    await $fetch('/api/questionnaire', {
      method: 'POST',
      body: {
        type: type.value,
        name: user.value ? undefined : contact.name || undefined,
        email: user.value ? undefined : contact.email || undefined,
        answers,
      },
    })
    done.value = true
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMsg.value = err.data?.statusMessage ?? err.statusMessage ?? t('kerdoiv.ui.submitFailed', 'A beküldés nem sikerült.')
  } finally {
    submitting.value = false
  }
}

useSeoMeta({ title: () => `${def.value?.title ?? 'Kérdőív'} | V40 Vital`, robots: 'noindex' })
</script>

<template>
  <Header />
  <div class="relative w-full pb-8 pt-12 lg:pt-16 lg:pb-10 lg:px-[100px] bg-[#E5F7F9]">
    <div class="w-full max-w-[820px] mx-auto p-4 lg:px-0">
      <h1 class="text-[30px] lg:text-[44px] dm-sans font-bold mb-2 text-[#171008]">{{ def?.title ?? t('kerdoiv.ui.title', 'Kérdőív') }}</h1>
      <p class="dm-sans text-[#171008] text-[17px]">{{ def?.lead }}</p>
    </div>
  </div>

  <div class="w-full bg-[#F4F4F0] py-8 lg:py-12 lg:px-[100px]">
    <div class="w-full max-w-[820px] mx-auto p-4 lg:px-0">
      <div v-if="error" class="bg-white rounded-lg p-8 text-center dm-sans">{{ t('kerdoiv.ui.unavailable', 'Ez a kérdőív nem elérhető.') }}</div>

      <div v-else-if="done" class="bg-white rounded-lg p-8 text-center">
        <p class="text-[40px] mb-2">✓</p>
        <h2 class="dm-sans font-bold text-[22px] mb-1">{{ t('kerdoiv.ui.thanksTitle', 'Köszönjük a kitöltést!') }}</h2>
        <p class="dm-sans text-[#00000080]">{{ t('kerdoiv.ui.thanksBody', 'A válaszait rögzítettük. Kollégáink a vizsgálat előtt áttekintik.') }}</p>
        <NuxtLink to="/" class="inline-block mt-6 bg-[#153131] text-white rounded-lg px-8 py-3.5 font-medium dm-sans">{{ t('kerdoiv.ui.backHome', 'Vissza a főoldalra') }}</NuxtLink>
      </div>

      <form v-else-if="def" class="flex flex-col gap-6" @submit.prevent="submit">
        <!-- Kapcsolat (vendégként) -->
        <div v-if="!user" class="bg-white rounded-lg p-5 lg:p-6">
          <p class="dm-sans font-semibold text-[16px] mb-3">{{ t('kerdoiv.ui.yourData', 'Az Ön adatai') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input v-model="contact.name" type="text" :placeholder="t('kerdoiv.ui.name', 'Név')"
              class="w-full border border-[#0000001A] rounded-lg px-3 py-2.5 dm-sans" />
            <input v-model="contact.email" type="email" :placeholder="t('kerdoiv.ui.email', 'E-mail')"
              class="w-full border border-[#0000001A] rounded-lg px-3 py-2.5 dm-sans" />
          </div>
        </div>

        <div v-for="(s, si) in def.sections" :key="si" class="bg-white rounded-lg p-5 lg:p-6">
          <h2 class="dm-sans font-bold text-[19px] mb-4 text-[#153131]">{{ s.title }}</h2>
          <div class="flex flex-col gap-5">
            <div v-for="q in s.questions" :key="q.id">
              <p class="dm-sans font-medium text-[15px] mb-2">{{ q.label }}</p>

              <!-- radio -->
              <div v-if="q.type === 'radio'" class="flex flex-wrap gap-2">
                <label v-for="opt in q.options" :key="opt"
                  class="cursor-pointer rounded-lg border px-3.5 py-2 text-[14px] dm-sans"
                  :class="answers[q.id] === opt ? 'bg-[#153131] border-[#153131] text-white' : 'bg-white border-[#0000001A] text-[#171008]'">
                  <input v-model="answers[q.id]" type="radio" :value="opt" class="hidden" />
                  {{ opt }}
                </label>
              </div>

              <!-- multicheck -->
              <div v-else-if="q.type === 'multicheck'" class="flex flex-col gap-1.5">
                <label v-for="opt in q.options" :key="opt" class="flex items-start gap-2.5 cursor-pointer dm-sans text-[14px]">
                  <input type="checkbox" class="mt-1 accent-[#153131]"
                    :checked="((answers[q.id] as string[]) ?? []).includes(opt)" @change="toggleCheck(q.id, opt)" />
                  <span>{{ opt }}</span>
                </label>
              </div>

              <!-- text -->
              <textarea v-else v-model="(answers[q.id] as string)" rows="2"
                class="w-full border border-[#0000001A] rounded-lg px-3 py-2.5 dm-sans text-[14px]" />

              <!-- kiegészítő megjegyzés radio-hoz -->
              <input v-if="q.hasNote && q.type === 'radio'" v-model="(answers[q.id + '_note'] as string)" type="text"
                :placeholder="t('kerdoiv.ui.detail', 'Részletezze (opcionális)')"
                class="w-full mt-2 border border-[#0000001A] rounded-lg px-3 py-2 dm-sans text-[14px]" />
            </div>
          </div>
        </div>

        <p v-if="errorMsg" class="dm-sans text-[#B3261E] font-medium">{{ errorMsg }}</p>
        <div>
          <button type="submit" :disabled="submitting"
            class="bg-[#153131] text-white rounded-lg px-8 py-4 font-medium dm-sans disabled:opacity-50">
            {{ submitting ? t('kerdoiv.ui.submitting', 'Beküldés…') : t('kerdoiv.ui.submit', 'Kérdőív beküldése') }}
          </button>
        </div>
      </form>
    </div>
  </div>
  <WFooter />
</template>
