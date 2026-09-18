<script setup lang="ts">
/**
 * Egyszerű naptár-választó születési dátumhoz. v-model: 'YYYY-MM-DD' string.
 * Év- és hónap-legördülővel (gyors visszaléptetés évtizedekre), nap-ráccsal.
 */
const model = defineModel<string>({ default: '' })
const props = withDefaults(defineProps<{ placeholder?: string; inputClass?: string }>(), { placeholder: 'Válassz dátumot' })

const MONTHS = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December']
const DOW = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']

const open = ref(false)
const today = new Date()
const currentYear = today.getFullYear()
const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i) // csökkenő

// A megjelenített hónap (a kiválasztott érték alapján, vagy alapból 1990).
const view = reactive({ y: 1990, m: 0 })
watch(model, (v) => { if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m] = v.split('-').map(Number); view.y = y!; view.m = m! - 1 } }, { immediate: true })

const label = computed(() => {
  if (!model.value) return ''
  const [y, m, d] = model.value.split('-').map(Number)
  return `${y}. ${MONTHS[(m ?? 1) - 1]} ${d}.`
})

const grid = computed(() => {
  const first = new Date(view.y, view.m, 1)
  const startDow = (first.getDay() + 6) % 7 // hétfő=0
  const days = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: startDow }, () => null)
  for (let d = 1; d <= days; d++) cells.push(d)
  return cells
})

const isSelected = (d: number) => model.value === `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const isFuture = (d: number) => new Date(view.y, view.m, d) > today

function pick(d: number) {
  if (isFuture(d)) return
  model.value = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  open.value = false
}
function prevMonth() { if (view.m === 0) { view.m = 11; view.y-- } else view.m-- }
function nextMonth() { const n = new Date(view.y, view.m + 1, 1); if (n <= today) { if (view.m === 11) { view.m = 0; view.y++ } else view.m++ } }

const root = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) { if (root.value && !root.value.contains(e.target as Node)) open.value = false }
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative">
    <button type="button" :class="props.inputClass" class="w-full text-left flex items-center justify-between" @click="open = !open">
      <span :class="label ? 'text-[#171008]' : 'text-[#00000060]'">{{ label || props.placeholder }}</span>
      <svg viewBox="0 0 24 24" class="h-5 w-5 text-[#00000070] shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
    </button>

    <div v-if="open" class="absolute z-50 mt-2 w-[300px] rounded-xl border border-[#E4E4DE] bg-white p-3 shadow-xl">
      <div class="flex items-center gap-2 mb-3">
        <button type="button" class="h-8 w-8 rounded-lg hover:bg-[#F4F4F0] flex items-center justify-center" @click="prevMonth">‹</button>
        <select v-model.number="view.m" class="flex-1 rounded-lg border border-[#E4E4DE] px-2 py-1.5 text-[14px] dm-sans">
          <option v-for="(mn, i) in MONTHS" :key="i" :value="i">{{ mn }}</option>
        </select>
        <select v-model.number="view.y" class="w-[88px] rounded-lg border border-[#E4E4DE] px-2 py-1.5 text-[14px] dm-sans">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <button type="button" class="h-8 w-8 rounded-lg hover:bg-[#F4F4F0] flex items-center justify-center" @click="nextMonth">›</button>
      </div>
      <div class="grid grid-cols-7 gap-1 mb-1">
        <span v-for="d in DOW" :key="d" class="text-center text-[11px] font-semibold text-[#98A2B3] py-1">{{ d }}</span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <template v-for="(c, i) in grid" :key="i">
          <span v-if="c === null" />
          <button
            v-else
            type="button"
            :disabled="isFuture(c)"
            class="h-9 rounded-lg text-[14px] dm-sans transition-colors"
            :class="isSelected(c) ? 'bg-[#153131] text-white font-semibold' : isFuture(c) ? 'text-[#D0D5DD] cursor-not-allowed' : 'text-[#171008] hover:bg-[#E5F7F9]'"
            @click="pick(c)"
          >{{ c }}</button>
        </template>
      </div>
    </div>
  </div>
</template>
