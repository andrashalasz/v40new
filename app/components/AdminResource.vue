<script setup lang="ts">
import {
  RESOURCES,
  softWarnings,
  slugify,
  type ResourceName,
  type Field,
  type Row,
} from '~/utils/adminFields'

/**
 * Generikus erőforrás-kezelő.
 *
 * Egy komponens szolgálja ki mind az öt entitást; a különbségeket a
 * `app/utils/adminFields.ts` leíró hordozza, amely a szerveroldali Zod
 * sémákat tükrözi. Így nem lehet olyan, hogy az egyik entitás űrlapja
 * máshogy viselkedik, vagy kimarad belőle egy mező.
 */
const props = defineProps<{ resource: ResourceName }>()
const def = computed(() => RESOURCES[props.resource])

const showArchived = ref(false)
const editing = ref<Row | null>(null)
const isNew = ref(false)
const archiving = ref<Row | null>(null)
const saving = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const toast = ref('')

const { data, refresh, status } = await useFetch<{ items: Row[] }>(
  () => `/api/admin/${props.resource}`,
  { query: computed(() => ({ archived: showArchived.value ? '1' : '0' })) },
)

// A választható opciók a többi erőforrásból jönnek. Egyszer kérjük le, mert a
// mezőleírók több helyen is hivatkoznak ugyanarra a listára.
const optionSources = computed(() => [
  ...new Set(def.value.fields.map((f) => f.optionsFrom).filter(Boolean)),
]) as ComputedRef<ResourceName[]>

const { data: refData } = await useAsyncData(
  () => `admin-refs-${props.resource}`,
  async () => {
    const out: Partial<Record<ResourceName, Row[]>> = {}
    await Promise.all(
      optionSources.value.map(async (name) => {
        const r = await $fetch<{ items: Row[] }>(`/api/admin/${name}`)
        out[name] = r.items
      }),
    )
    return out
  },
  { watch: [() => props.resource] },
)

const items = computed(() => data.value?.items ?? [])
const active = computed(() => items.value.filter((r) => !r.archivedAt))
const archived = computed(() => items.value.filter((r) => r.archivedAt))

function optionsFor(f: Field) {
  if (f.options) return f.options
  // Külön lokális változó: a `f.optionsFrom` szűkítése önmagában nem élte túl
  // az indexelést, mert a prop-ból származó objektum írható.
  const src = f.optionsFrom
  if (!src) return []
  const rows = refData.value?.[src] ?? []
  const label = f.optionsLabel ?? 'name'
  return rows
    .filter((r) => !r.archivedAt)
    .map((r) => ({ value: r.id as number, label: String(r[label]) }))
}

/**
 * A kapcsolt rekordokból a *Ids tömb – az űrlap ezt szerkeszti.
 *
 * A kapcsolótáblák neve és az idegen kulcs mezőneve nem vezethető le a
 * *Ids kulcsból, ezért explicit leképezés van. A `noUncheckedIndexedAccess`
 * miatt a destrukturálás `string | undefined`-ot ad, ezért egyben ellenőrzünk.
 */
const JOIN_MAP: Record<string, { rel: string; fk: string }> = {
  roomIds: { rel: 'rooms', fk: 'roomId' },
  practitionerIds: { rel: 'practitioners', fk: 'practitionerId' },
  serviceIds: { rel: 'services', fk: 'serviceId' },
}

function idsFrom(row: Row, key: string): number[] {
  const m = JOIN_MAP[key]
  if (!m) return []
  return ((row[m.rel] as Row[] | undefined) ?? []).map((j) => j[m.fk] as number)
}

function openNew() {
  fieldErrors.value = {}
  isNew.value = true
  editing.value = def.value.blank()
}

function openEdit(row: Row) {
  fieldErrors.value = {}
  isNew.value = false
  const draft = def.value.blank()
  for (const key of Object.keys(draft)) {
    draft[key] = key.endsWith('Ids') ? idsFrom(row, key) : (row[key] ?? draft[key])
  }
  draft.id = row.id
  editing.value = draft
}

function toggleMulti(key: string, id: number) {
  const cur = (editing.value![key] as number[]) ?? []
  editing.value![key] = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
}

const warnings = computed(() =>
  editing.value ? softWarnings(props.resource, editing.value) : [],
)

async function save() {
  const d = editing.value!
  fieldErrors.value = {}

  // Kényelmi lépés: üres slug esetén a megnevezésből képezzük. Az érdemi
  // ellenőrzés a szerveren történik, mert a kliens megkerülhető.
  if ('slug' in d && !String(d.slug || '').trim()) {
    d.slug = slugify(String(d[def.value.titleKey] ?? ''))
  }

  saving.value = true
  try {
    const url = isNew.value
      ? `/api/admin/${props.resource}`
      : `/api/admin/${props.resource}/${d.id}`
    await $fetch(url, { method: isNew.value ? 'POST' : 'PUT', body: d })
    toast.value = isNew.value ? 'Létrehozva' : 'Mentve'
    editing.value = null
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { data?: { fields?: Record<string, string> }; statusMessage?: string } }
    fieldErrors.value = err.data?.data?.fields ?? {}
    if (!Object.keys(fieldErrors.value).length) {
      toast.value = err.data?.statusMessage ?? 'A mentés nem sikerült.'
    }
  } finally {
    saving.value = false
    setTimeout(() => (toast.value = ''), 2500)
  }
}

const archiveInfo = ref<{ count: number; label: string } | null>(null)

async function doArchive() {
  const row = archiving.value!
  const res = await $fetch<{ refs: { count: number; label: string } }>(
    `/api/admin/${props.resource}/${row.id}`,
    { method: 'DELETE' },
  )
  archiveInfo.value = res.refs
  archiving.value = null
  toast.value = 'Archiválva'
  await refresh()
  setTimeout(() => (toast.value = ''), 2500)
}

async function restore(row: Row) {
  await $fetch(`/api/admin/${props.resource}/${row.id}/restore`, { method: 'POST' })
  toast.value = 'Visszaállítva'
  await refresh()
  setTimeout(() => (toast.value = ''), 2500)
}

const spanClass = (f: Field) =>
  f.span === 3 ? 'sm:col-span-2' : f.span === 2 ? 'sm:col-span-3' : 'sm:col-span-6'

const inputBase =
  'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-shadow focus:border-[#153131] focus:ring-2 focus:ring-[#153131]/15'
const inputClass = (key: string) =>
  `${inputBase} ${fieldErrors.value[key] ? 'border-[#FDA29B]' : 'border-[#D0D5DD]'}`

// A mezőket szekciókra bontjuk (Field.group). A csoport nélküli mezők egy
// cím nélküli szekcióba kerülnek – így a rövid űrlapok változatlanul néznek ki.
const fieldGroups = computed(() => {
  const groups: { title: string | null; fields: Field[] }[] = []
  for (const f of def.value.fields) {
    const title = f.group ?? null
    let g = groups.find((x) => x.title === title)
    if (!g) {
      g = { title, fields: [] }
      groups.push(g)
    }
    g.fields.push(f)
  }
  return groups
})

// Képfeltöltés az admin űrlapokon. A fájl a /api/admin/upload-ra megy, a
// visszakapott URL-t az adott mezőbe írjuk.
const uploading = ref<string | null>(null)

async function uploadImage(key: string, e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !editing.value) return
  uploading.value = key
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ url: string }>('/api/admin/upload', { method: 'POST', body: fd })
    editing.value[key] = res.url
  } catch (err: unknown) {
    toast.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'A feltöltés nem sikerült.'
    setTimeout(() => (toast.value = ''), 2500)
  } finally {
    uploading.value = null
    input.value = ''
  }
}
</script>

<template>
  <div>
    <!-- Fejléc -->
    <div class="flex flex-wrap items-start gap-4 mb-5">
      <div>
        <h1 class="font-bold text-[24px] tracking-tight">{{ def.plural }}</h1>
        <p class="text-[#667085] max-w-2xl text-sm mt-0.5">{{ def.lead }}</p>
      </div>
      <button
        class="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#153131] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2525] transition-colors"
        @click="openNew"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        Új {{ def.singular }}
      </button>
    </div>

    <!-- Lista -->
    <div class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FAFAFB]">
              <th
                v-for="c in def.columns"
                :key="c.label"
                class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] whitespace-nowrap"
              >
                {{ c.label }}
              </th>
              <th class="border-b border-[#ECEDEF]" />
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F0F1F3]">
            <tr v-for="row in active" :key="String(row.id)" class="hover:bg-[#FAFAFB] transition-colors">
              <td
                v-for="(c, i) in def.columns"
                :key="c.label"
                class="py-3 px-4 align-middle"
                :class="i === 0 ? 'font-semibold text-[#101828]' : 'text-[#475467]'"
              >
                {{ c.get(row) }}
              </td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <button
                  class="rounded-lg border border-[#D9DCE1] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
                  @click="openEdit(row)"
                >
                  Szerkesztés
                </button>
                <button
                  class="ml-1.5 rounded-lg border border-[#FECDCA] bg-white px-3 py-1.5 text-xs font-semibold text-[#B42318] hover:bg-[#FEF3F2] transition-colors"
                  @click="archiving = row"
                >
                  Törlés
                </button>
              </td>
            </tr>
            <tr v-if="!active.length">
              <td :colspan="def.columns.length + 1" class="py-10 px-4 text-center text-[#667085]">
                Még nincs egy sem. Kezdd az „Új {{ def.singular }}" gombbal.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <label class="flex items-center gap-2 text-sm text-[#667085] border-t border-[#ECEDEF] px-4 py-3">
        <input v-model="showArchived" type="checkbox" class="accent-[#153131]" />
        Archiváltak mutatása
      </label>
    </div>

    <!-- Archivált -->
    <div v-if="showArchived && archived.length" class="mt-4 rounded-xl border border-[#ECEDEF] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <h2 class="font-semibold mb-1">Archivált ({{ archived.length }})</h2>
      <p class="text-[#667085] text-sm mb-3">
        Ezek nem jelennek meg a weboldalon, de a korábbi foglalások és számlák
        továbbra is hivatkoznak rájuk.
      </p>
      <div v-for="row in archived" :key="String(row.id)" class="flex items-center gap-3 border-t border-[#F0F1F3] py-3 opacity-70">
        <span class="font-semibold text-sm">{{ row[def.titleKey] }}</span>
        <button
          class="ml-auto rounded-lg border border-[#D9DCE1] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
          @click="restore(row)"
        >
          Visszaállítás
        </button>
      </div>
    </div>

    <!-- Szerkesztő -->
    <div
      v-if="editing"
      class="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-[#0C111D]/50 backdrop-blur-sm p-4 sm:p-6"
      @click.self="editing = null"
    >
      <div class="w-full max-w-3xl rounded-2xl bg-white shadow-2xl my-4">
        <div class="flex items-start justify-between gap-4 border-b border-[#ECEDEF] px-6 py-5">
          <div>
            <h3 class="font-bold text-[18px] tracking-tight">
              {{ isNew ? `Új ${def.singular}` : `${def.singular} szerkesztése` }}
            </h3>
            <p class="text-[#667085] text-[13px] mt-0.5">A csillagos mezők kitöltése kötelező.</p>
          </div>
          <button
            class="text-[#98A2B3] hover:text-[#101828] hover:bg-[#F1F2F4] rounded-lg p-1.5 transition-colors"
            @click="editing = null"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div class="px-6 py-5">
          <div v-for="(grp, gi) in fieldGroups" :key="gi" :class="gi > 0 ? 'mt-6' : ''">
            <h4 v-if="grp.title" class="text-[13px] font-semibold text-[#101828] mb-3 pb-1.5 border-b border-[#F0F1F3]">
              {{ grp.title }}
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <div v-for="f in grp.fields" :key="f.key" :class="spanClass(f)">
              <label v-if="f.type !== 'bool'" class="mb-1.5 block text-[13px] font-semibold text-[#344054]">
                {{ f.label }}<span v-if="f.required" class="text-[#B42318]"> *</span>
              </label>

              <input
                v-if="f.type === 'text'"
                v-model="editing[f.key] as string"
                type="text"
                :class="inputClass(f.key)"
              />

              <input
                v-else-if="f.type === 'number'"
                v-model.number="editing[f.key] as number"
                type="number"
                :min="f.min"
                :class="inputClass(f.key)"
              />

              <textarea
                v-else-if="f.type === 'textarea'"
                v-model="editing[f.key] as string"
                :rows="f.rows ?? 3"
                :class="inputClass(f.key)"
              />

              <select
                v-else-if="f.type === 'select'"
                v-model="editing[f.key]"
                :class="`${inputBase} border-[#D0D5DD] bg-white`"
              >
                <option v-if="!f.required" :value="null">– nincs –</option>
                <option v-for="o in optionsFor(f)" :key="String(o.value)" :value="o.value">
                  {{ o.label }}
                </option>
              </select>

              <label v-else-if="f.type === 'bool'" class="flex items-center gap-2.5 text-sm font-semibold text-[#344054] mt-1">
                <input v-model="editing[f.key]" type="checkbox" class="accent-[#153131] w-4 h-4" />
                {{ f.label }}
              </label>

              <div v-else-if="f.type === 'multi'" class="flex flex-wrap gap-2">
                <label
                  v-for="o in optionsFor(f)"
                  :key="String(o.value)"
                  class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
                  :class="((editing[f.key] as number[]) ?? []).includes(o.value as number)
                    ? 'border-[#153131] bg-[#E9F3F2] text-[#153131] font-medium'
                    : 'border-[#D0D5DD] bg-white hover:bg-[#F9FAFB]'"
                >
                  <input
                    type="checkbox"
                    class="accent-[#153131]"
                    :checked="((editing[f.key] as number[]) ?? []).includes(o.value as number)"
                    @change="toggleMulti(f.key, o.value as number)"
                  />
                  {{ o.label }}
                </label>
                <span v-if="!optionsFor(f).length" class="text-sm text-[#667085]">
                  Nincs mit választani – előbb vegyél fel legalább egyet.
                </span>
              </div>

              <div v-else-if="f.type === 'paragraphs'" class="flex flex-col gap-2">
                <div
                  v-for="(_, i) in (editing[f.key] as string[])"
                  :key="i"
                  class="flex items-start gap-2"
                >
                  <textarea
                    v-model="(editing[f.key] as string[])[i]"
                    rows="3"
                    :class="`${inputBase} flex-1 border-[#D0D5DD]`"
                  />
                  <button
                    class="h-9 w-9 shrink-0 rounded-lg border border-[#D9DCE1] text-[#667085] hover:bg-[#F9FAFB] transition-colors"
                    @click="(editing[f.key] as string[]).splice(i, 1)"
                  >
                    ✕
                  </button>
                </div>
                <button
                  class="self-start rounded-lg border border-dashed border-[#D0D5DD] px-3 py-1.5 text-sm font-semibold text-[#153131] hover:bg-[#F9FAFB] transition-colors"
                  @click="(editing[f.key] as string[]).push('')"
                >
                  + Bekezdés
                </button>
              </div>

              <div v-else-if="f.type === 'image'" class="flex items-center gap-3">
                <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#D0D5DD] bg-[#F9FAFB] flex items-center justify-center">
                  <img v-if="editing[f.key]" :src="editing[f.key] as string" alt="" class="h-full w-full object-cover" />
                  <svg v-else viewBox="0 0 24 24" class="h-6 w-6 text-[#C4C9D1]" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15l-5-5L5 21M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" /></svg>
                </div>
                <div class="flex flex-col items-start gap-1.5">
                  <label class="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[#D9DCE1] bg-white px-3 py-1.5 text-xs font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors">
                    <input type="file" accept="image/*" class="hidden" @change="uploadImage(f.key, $event)" />
                    <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    {{ uploading === f.key ? 'Feltöltés…' : (editing[f.key] ? 'Csere' : 'Feltöltés') }}
                  </label>
                  <button v-if="editing[f.key]" type="button" class="text-xs font-semibold text-[#B42318]" @click="editing[f.key] = null">
                    Eltávolítás
                  </button>
                </div>
              </div>

              <p v-if="fieldErrors[f.key]" class="mt-1.5 text-xs font-semibold text-[#B42318]">
                {{ fieldErrors[f.key] }}
              </p>
              <p v-else-if="f.hint" class="mt-1.5 text-xs text-[#667085]">{{ f.hint }}</p>
            </div>
            </div>
          </div>

          <div v-if="warnings.length" class="mt-5 rounded-lg border border-[#FEDF89] bg-[#FFFCF5] p-3.5 text-sm text-[#B54708]">
            <b class="text-[#93370D]">Érdemes átnézni</b>
            <ul class="mt-1.5 list-disc pl-5 space-y-0.5">
              <li v-for="w in warnings" :key="w">{{ w }}</li>
            </ul>
          </div>
        </div>

        <div class="flex flex-wrap justify-end gap-2 border-t border-[#ECEDEF] px-6 py-4">
          <button
            class="rounded-lg border border-[#D9DCE1] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
            @click="editing = null"
          >
            Mégsem
          </button>
          <button
            class="rounded-lg bg-[#153131] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2525] disabled:opacity-40 transition-colors"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? 'Mentés…' : 'Mentés' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Archiválás megerősítése -->
    <div
      v-if="archiving"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#0C111D]/50 backdrop-blur-sm p-4"
      @click.self="archiving = null"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 class="font-bold text-[18px] tracking-tight">Törlés: {{ archiving[def.titleKey] }}</h3>
        <p class="mt-1 text-sm text-[#667085]">
          Ez a {{ def.singular }} azonnal eltűnik a weboldalról és a foglalható listákból.
        </p>
        <div class="mt-4 rounded-lg border border-[#B2E5EA] bg-[#EDFAFB] p-3.5 text-sm text-[#134E52]">
          Fizikai törlés helyett archiválás történik. Amire foglalás vagy számla
          hivatkozik, azt nem lehet valóban törölni – a hivatkozás elszakadna, és
          az elszámolás visszakövethetetlen lenne. Az archivált elem bármikor
          visszaállítható.
        </div>
        <div class="mt-6 flex justify-end gap-2 border-t border-[#ECEDEF] pt-4">
          <button
            class="rounded-lg border border-[#D9DCE1] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
            @click="archiving = null"
          >
            Mégsem
          </button>
          <button
            class="rounded-lg bg-[#B42318] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#912018] transition-colors"
            @click="doArchive"
          >
            Törlés
          </button>
        </div>
      </div>
    </div>

    <Transition name="toast">
      <div
        v-if="toast"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-[#101828] px-5 py-3 text-sm font-semibold text-white shadow-xl"
      >
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
