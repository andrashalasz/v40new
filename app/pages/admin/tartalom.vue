<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

/* ---------------------------------------------------------------------------
 * Egyesített tartalom + fordítás hub.
 * Bal oldali navigáció: „Weboldal szövegei" (oldalanként) és „Katalógus"
 * (kezelések/típusok/orvosok/bérletek). Jobbra CSAK a kiválasztott csoport,
 * nyelvenkénti oszlopokkal – a célnyelvek ki/be kapcsolhatók.
 * ------------------------------------------------------------------------- */

interface CRow { key: string; page: string; group: string | null; label: string; values: Record<string, string> }
interface Matrix { locales: string[]; defaultLocale: string; languages: { code: string; name: string }[]; rows: CRow[]; stats: Record<string, { filled: number; total: number }> }
interface TField { key: string; label: string; multiline: boolean }
interface TItem { id: number; heading: string; source: Record<string, string>; en: Record<string, string>; de: Record<string, string> }
interface TGroup { entity: string; label: string; fields: TField[]; items: TItem[] }

const { data: matrix, refresh: refreshMatrix } = await useFetch<Matrix>('/api/admin/content-matrix')
const { data: trData, refresh: refreshTr } = await useFetch<{ groups: TGroup[] }>('/api/admin/translations')

const locales = computed(() => matrix.value?.locales ?? ['hu'])
const defLoc = computed(() => matrix.value?.defaultLocale ?? 'hu')
const targets = computed(() => locales.value.filter((l) => l !== defLoc.value))
const langName = (c: string) => matrix.value?.languages.find((l) => l.code === c)?.name ?? c.toUpperCase()

// látható célnyelvek (ki/be kapcsolható)
const visible = reactive<Record<string, boolean>>({})
watchEffect(() => { for (const l of targets.value) if (visible[l] === undefined) visible[l] = true })
const shownLangs = computed(() => [defLoc.value, ...targets.value.filter((l) => visible[l])])

const PAGE_LABEL: Record<string, string> = {
  global: 'Globális (fejléc, lábléc, menü)', home: 'Nyitóoldal', kezelesek: 'Kezelések oldal',
  longevity: 'Longevity', kalkulacio: 'Navigátor', rolunk: 'Rólunk', kapcsolat: 'Kapcsolat',
  gyik: 'GYIK', foglalas: 'Foglalás', fiok: 'Fiók', kerdoiv: 'Kérdőív',
}
const pageLabel = (p: string) => PAGE_LABEL[p] ?? p

// navigáció
const pages = computed(() => {
  const m = new Map<string, number>()
  for (const r of matrix.value?.rows ?? []) m.set(r.page, (m.get(r.page) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([page, count]) => ({ page, count }))
})
const catalog = computed(() => trData.value?.groups ?? [])

const sel = ref<{ kind: 'content' | 'catalog'; id: string }>({ kind: 'content', id: '' })
watchEffect(() => { if (!sel.value.id && pages.value.length) sel.value = { kind: 'content', id: pages.value[0]!.page } })

const search = ref('')
const onlyMissing = ref(false)

// ---- ContentBlock szerkesztés (key -> loc -> value) ----
const cEdit = reactive<Record<string, Record<string, string>>>({})
watchEffect(() => { for (const r of matrix.value?.rows ?? []) { const e = (cEdit[r.key] ??= {}); for (const l of locales.value) if (e[l] === undefined) e[l] = r.values[l] ?? '' } })
const cVal = (k: string, l: string) => cEdit[k]?.[l] ?? ''
const cSet = (k: string, l: string, v: string) => { (cEdit[k] ??= {})[l] = v }
const cOrig = (k: string, l: string) => matrix.value?.rows.find((r) => r.key === k)?.values[l] ?? ''
const cDirty = (k: string, l: string) => cVal(k, l) !== cOrig(k, l)

// ---- Entity fordítás szerkesztés (entity -> id -> loc -> field) ----
const tEdit = reactive<Record<string, Record<number, Record<string, Record<string, string>>>>>({})
watchEffect(() => {
  for (const g of catalog.value) { const ge = (tEdit[g.entity] ??= {}); for (const it of g.items) { const ie = (ge[it.id] ??= {}); for (const l of targets.value) { const le = (ie[l] ??= {}); for (const f of g.fields) if (le[f.key] === undefined) le[f.key] = (l === 'en' ? it.en : it.de)[f.key] ?? '' } } }
})
const tVal = (e: string, id: number, l: string, f: string) => tEdit[e]?.[id]?.[l]?.[f] ?? ''
const tSet = (e: string, id: number, l: string, f: string, v: string) => { ((((tEdit[e] ??= {})[id] ??= {})[l] ??= {}))[f] = v }
const tOrig = (it: TItem, l: string, f: string) => ((l === 'en' ? it.en : it.de)[f] ?? '')
const tDirty = (e: string, it: TItem, l: string, f: string) => tVal(e, it.id, l, f) !== tOrig(it, l, f)

// ---- aktuális nézet adatai ----
const activeContentRows = computed(() => {
  if (sel.value.kind !== 'content') return []
  const q = search.value.trim().toLowerCase()
  return (matrix.value?.rows ?? []).filter((r) => r.page === sel.value.id)
    .filter((r) => !onlyMissing.value || targets.value.some((l) => visible[l] && !cVal(r.key, l).trim()))
    .filter((r) => !q || r.label.toLowerCase().includes(q) || r.key.toLowerCase().includes(q) || Object.values(r.values).some((v) => (v ?? '').toLowerCase().includes(q)))
})
const activeGroup = computed(() => sel.value.kind === 'catalog' ? catalog.value.find((g) => g.entity === sel.value.id) : undefined)
const activeCatalogItems = computed(() => {
  const g = activeGroup.value; if (!g) return []
  const q = search.value.trim().toLowerCase()
  return g.items
    .filter((it) => !onlyMissing.value || targets.value.some((l) => visible[l] && g.fields.some((f) => (it.source[f.key] ?? '').trim() && !tVal(g.entity, it.id, l, f.key).trim())))
    .filter((it) => !q || it.heading.toLowerCase().includes(q) || Object.values(it.source).some((v) => (v ?? '').toLowerCase().includes(q)))
})

// ---- haladás az aktuális csoportban, célnyelvenként ----
const progress = computed(() => {
  const out: Record<string, { filled: number; total: number }> = {}
  for (const l of targets.value) {
    let filled = 0, total = 0
    if (sel.value.kind === 'content') {
      for (const r of (matrix.value?.rows ?? []).filter((r) => r.page === sel.value.id)) { total++; if (cVal(r.key, l).trim()) filled++ }
    } else if (activeGroup.value) {
      for (const it of activeGroup.value.items) for (const f of activeGroup.value.fields) { if (!(it.source[f.key] ?? '').trim()) continue; total++; if (tVal(activeGroup.value.entity, it.id, l, f.key).trim()) filled++ }
    }
    out[l] = { filled, total }
  }
  return out
})

// ---- mentés ----
const saving = ref(false); const toast = ref('')
const dirtyCount = computed(() => {
  let n = 0
  if (sel.value.kind === 'content') { for (const r of matrix.value?.rows ?? []) if (r.page === sel.value.id) for (const l of locales.value) if (cDirty(r.key, l)) n++ }
  else if (activeGroup.value) { const g = activeGroup.value; for (const it of g.items) for (const l of targets.value) for (const f of g.fields) if (tDirty(g.entity, it, l, f.key)) n++ }
  return n
})
async function save() {
  if (!dirtyCount.value) return
  saving.value = true
  try {
    if (sel.value.kind === 'content') {
      const changes: { key: string; locale: string; value: string }[] = []
      for (const r of matrix.value?.rows ?? []) if (r.page === sel.value.id) for (const l of locales.value) if (cDirty(r.key, l)) changes.push({ key: r.key, locale: l, value: cVal(r.key, l) })
      await $fetch('/api/admin/content-matrix', { method: 'PUT', body: { changes } })
      await refreshMatrix()
    } else if (activeGroup.value) {
      const g = activeGroup.value
      for (const it of g.items) for (const l of targets.value) for (const f of g.fields) if (tDirty(g.entity, it, l, f.key)) await $fetch('/api/admin/translations', { method: 'PUT', body: { entity: g.entity, entityId: it.id, field: f.key, locale: l, value: tVal(g.entity, it.id, l, f.key) } })
      await refreshTr()
    }
    toast.value = 'Mentve.'; setTimeout(() => (toast.value = ''), 2500)
  } catch (e: unknown) { toast.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'A mentés nem sikerült.' } finally { saving.value = false }
}
</script>

<template>
  <div class="flex gap-5 pb-24">
    <!-- BAL NAVIGÁCIÓ -->
    <aside class="w-56 shrink-0 hidden md:block">
      <div class="sticky top-20 space-y-5">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98A2B3] px-2 mb-1.5">Weboldal szövegei</p>
          <button v-for="p in pages" :key="p.page" class="w-full text-left rounded-lg px-3 py-2 text-sm flex items-center justify-between"
            :class="sel.kind==='content' && sel.id===p.page ? 'bg-[#153131] text-white font-semibold' : 'text-[#344054] hover:bg-white'"
            @click="sel={kind:'content',id:p.page}">
            <span class="truncate">{{ pageLabel(p.page) }}</span>
            <span class="text-[11px]" :class="sel.kind==='content'&&sel.id===p.page?'text-white/60':'text-[#98A2B3]'">{{ p.count }}</span>
          </button>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98A2B3] px-2 mb-1.5">Katalógus (fordítás)</p>
          <button v-for="g in catalog" :key="g.entity" class="w-full text-left rounded-lg px-3 py-2 text-sm flex items-center justify-between"
            :class="sel.kind==='catalog' && sel.id===g.entity ? 'bg-[#153131] text-white font-semibold' : 'text-[#344054] hover:bg-white'"
            @click="sel={kind:'catalog',id:g.entity}">
            <span class="truncate">{{ g.label }}</span>
            <span class="text-[11px]" :class="sel.kind==='catalog'&&sel.id===g.entity?'text-white/60':'text-[#98A2B3]'">{{ g.items.length }}</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- FŐ PANEL -->
    <div class="flex-1 min-w-0">
      <div class="mb-3">
        <h1 class="font-bold text-[24px] tracking-tight">Szövegek &amp; fordítások</h1>
        <p class="text-[#667085] text-sm mt-0.5">Bal oldalon válaszd ki, mit szerkesztesz. A nyelvek ki/be kapcsolhatók.</p>
      </div>

      <!-- vezérlősor -->
      <div class="flex flex-wrap items-center gap-2.5 mb-4 sticky top-16 z-20 bg-[#F6F7F9]/90 backdrop-blur py-2">
        <!-- mobil csoportválasztó -->
        <select class="md:hidden rounded-lg border border-[#D0D5DD] bg-white px-3 py-2.5 text-sm"
          :value="sel.kind+':'+sel.id" @change="(e:any)=>{const [k,i]=e.target.value.split(':');sel={kind:k,id:i}}">
          <optgroup label="Weboldal">
            <option v-for="p in pages" :key="p.page" :value="'content:'+p.page">{{ pageLabel(p.page) }}</option>
          </optgroup>
          <optgroup label="Katalógus">
            <option v-for="g in catalog" :key="g.entity" :value="'catalog:'+g.entity">{{ g.label }}</option>
          </optgroup>
        </select>
        <input v-model="search" type="search" placeholder="Keresés…" class="flex-1 min-w-[160px] rounded-lg border border-[#D0D5DD] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#153131]" />
        <label class="flex items-center gap-2 text-sm bg-white border border-[#D0D5DD] rounded-lg px-3 py-2.5 cursor-pointer">
          <input v-model="onlyMissing" type="checkbox" class="accent-[#153131]" /> Csak hiányzó
        </label>
        <!-- nyelv-kapcsolók -->
        <div class="flex items-center gap-1.5">
          <span class="text-[12px] text-[#98A2B3]">Nyelvek:</span>
          <span class="text-[12px] font-semibold text-[#153131] bg-[#E9F3F2] rounded-full px-2.5 py-1">{{ langName(defLoc) }}</span>
          <button v-for="l in targets" :key="l" class="text-[12px] font-semibold rounded-full px-2.5 py-1 border"
            :class="visible[l] ? 'bg-[#153131] text-white border-[#153131]' : 'bg-white text-[#98A2B3] border-[#D0D5DD]'"
            @click="visible[l]=!visible[l]">{{ langName(l) }}</button>
        </div>
      </div>

      <!-- haladás -->
      <div class="flex flex-wrap gap-3 mb-4">
        <div v-for="l in targets.filter(t=>visible[t])" :key="l" class="rounded-lg border border-[#ECEDEF] bg-white px-3 py-1.5 min-w-[130px]">
          <div class="flex items-center justify-between text-[12px] mb-1"><span class="font-semibold">{{ langName(l) }}</span><span class="text-[#667085]">{{ progress[l]?.filled }}/{{ progress[l]?.total }}</span></div>
          <div class="h-[5px] bg-[#EEF1F3] rounded-full overflow-hidden"><i class="block h-full bg-[#153131]" :style="{width:`${Math.round(100*(progress[l]?.filled??0)/Math.max(1,progress[l]?.total??1))}%`}" /></div>
        </div>
      </div>

      <!-- CONTENT nézet -->
      <div v-if="sel.kind==='content'" class="space-y-3">
        <div v-for="r in activeContentRows" :key="r.key" class="rounded-lg border border-[#ECEDEF] bg-white p-3">
          <div class="text-[12px] text-[#475467] mb-2"><span class="font-semibold">{{ r.label }}</span><span class="font-mono text-[11px] text-[#98A2B3]"> · {{ r.key }}</span></div>
          <div class="grid grid-cols-1 gap-3" :class="shownLangs.length>=3?'lg:grid-cols-3':shownLangs.length===2?'lg:grid-cols-2':''">
            <div v-for="l in shownLangs" :key="l">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[11px] font-bold uppercase" :class="l===defLoc?'text-[#98A2B3]':'text-[#153131]'">{{ langName(l) }}<span v-if="l===defLoc" class="font-normal normal-case"> · forrás</span></span>
                <span v-if="l!==defLoc && !cVal(r.key,l).trim()" class="text-[10px] text-[#B25E09] font-semibold">hiányzik</span>
              </div>
              <textarea :value="cVal(r.key,l)" @input="cSet(r.key,l,($event.target as HTMLTextAreaElement).value)" rows="2"
                class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#153131] focus:ring-2 focus:ring-[#153131]/15 resize-y"
                :class="cDirty(r.key,l)?'border-[#153131] bg-[#F5FBFB]':'border-[#E4E7EC]'" />
            </div>
          </div>
        </div>
        <div v-if="!activeContentRows.length" class="p-8 text-center text-[#667085] text-sm rounded-xl border border-[#ECEDEF] bg-white">Nincs találat.</div>
      </div>

      <!-- CATALOG nézet -->
      <div v-else-if="activeGroup" class="space-y-3">
        <div v-for="it in activeCatalogItems" :key="it.id" class="rounded-lg border border-[#ECEDEF] bg-white p-3">
          <p class="font-semibold text-[14px] mb-2">{{ it.heading }}</p>
          <div v-for="f in activeGroup.fields" :key="f.key" class="mb-3 last:mb-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#98A2B3] mb-1">{{ f.label }}</p>
            <div class="grid grid-cols-1 gap-3" :class="shownLangs.length>=3?'lg:grid-cols-3':shownLangs.length===2?'lg:grid-cols-2':''">
              <div>
                <p class="text-[10px] font-bold uppercase text-[#98A2B3] mb-1">{{ langName(defLoc) }} · forrás</p>
                <p class="text-sm text-[#475467] bg-[#FAFAFB] rounded-lg border border-[#F0F1F3] px-3 py-2 whitespace-pre-line min-h-[40px]">{{ it.source[f.key] || '—' }}</p>
              </div>
              <div v-for="l in targets.filter(t=>visible[t])" :key="l">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[10px] font-bold uppercase text-[#153131]">{{ langName(l) }}</span>
                  <span v-if="(it.source[f.key]||'').trim() && !tVal(activeGroup.entity,it.id,l,f.key).trim()" class="text-[10px] text-[#B25E09] font-semibold">hiányzik</span>
                </div>
                <textarea v-if="f.multiline" :value="tVal(activeGroup.entity,it.id,l,f.key)" @input="tSet(activeGroup.entity,it.id,l,f.key,($event.target as HTMLTextAreaElement).value)" rows="3"
                  class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#153131] focus:ring-2 focus:ring-[#153131]/15 resize-y" :class="tDirty(activeGroup.entity,it,l,f.key)?'border-[#153131] bg-[#F5FBFB]':'border-[#E4E7EC]'" />
                <input v-else :value="tVal(activeGroup.entity,it.id,l,f.key)" @input="tSet(activeGroup.entity,it.id,l,f.key,($event.target as HTMLInputElement).value)" type="text"
                  class="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#153131] focus:ring-2 focus:ring-[#153131]/15" :class="tDirty(activeGroup.entity,it,l,f.key)?'border-[#153131] bg-[#F5FBFB]':'border-[#E4E7EC]'" />
              </div>
            </div>
          </div>
        </div>
        <div v-if="!activeCatalogItems.length" class="p-8 text-center text-[#667085] text-sm rounded-xl border border-[#ECEDEF] bg-white">Nincs találat.</div>
      </div>
    </div>

    <!-- mentés-sáv -->
    <div class="fixed bottom-0 left-0 right-0 md:left-64 z-30 border-t border-[#ECEDEF] bg-white/90 backdrop-blur px-5 lg:px-8 py-3 flex items-center justify-between">
      <span class="text-sm text-[#667085]"><template v-if="dirtyCount">{{ dirtyCount }} módosítás mentésre vár</template><template v-else>Nincs mentendő módosítás</template></span>
      <button class="rounded-lg bg-[#153131] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2525] disabled:opacity-40" :disabled="saving||!dirtyCount" @click="save">{{ saving?'Mentés…':`Mentés${dirtyCount?` (${dirtyCount})`:''}` }}</button>
    </div>

    <Transition name="fade"><div v-if="toast" class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 rounded-lg bg-[#101828] px-5 py-3 text-sm font-semibold text-white shadow-xl">{{ toast }}</div></Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
