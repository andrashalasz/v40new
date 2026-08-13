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
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start gap-4 mb-5">
      <div>
        <h1 class="font-bold text-[22px] mb-0.5">{{ def.plural }}</h1>
        <p class="text-[#6B6660] max-w-2xl text-sm">{{ def.lead }}</p>
      </div>
      <button
        class="ml-auto rounded-lg bg-[#153131] px-4 py-2.5 text-sm font-semibold text-white"
        @click="openNew"
      >
        + Új {{ def.singular }}
      </button>
    </div>

    <!-- lista -->
    <div class="rounded-xl border border-[#E4E4DE] bg-white p-4 overflow-x-auto">
      <p v-if="status === 'pending'" class="text-[#6B6660] text-sm">Betöltés…</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr>
            <th
              v-for="c in def.columns"
              :key="c.label"
              class="border-b border-[#E4E4DE] py-2.5 px-2 text-left text-[10px] font-bold uppercase tracking-[0.07em] text-[#6B6660] whitespace-nowrap"
            >
              {{ c.label }}
            </th>
            <th class="border-b border-[#E4E4DE]" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in active" :key="String(row.id)">
            <td
              v-for="(c, i) in def.columns"
              :key="c.label"
              class="border-b border-[#E4E4DE] py-2.5 px-2"
              :class="i === 0 ? 'font-semibold' : ''"
            >
              {{ c.get(row) }}
            </td>
            <td class="border-b border-[#E4E4DE] py-2.5 px-2 text-right whitespace-nowrap">
              <button
                class="rounded-lg border border-[#E4E4DE] bg-white px-3 py-1.5 text-xs font-semibold"
                @click="openEdit(row)"
              >
                Szerkesztés
              </button>
              <button
                class="ml-1.5 rounded-lg border border-[#EED9D7] bg-white px-3 py-1.5 text-xs font-semibold text-[#B3261E]"
                @click="archiving = row"
              >
                Törlés
              </button>
            </td>
          </tr>
          <tr v-if="!active.length">
            <td :colspan="def.columns.length + 1" class="py-4 px-2 text-[#6B6660]">
              Még nincs egy sem.
            </td>
          </tr>
        </tbody>
      </table>

      <label class="mt-4 flex items-center gap-2 text-sm text-[#6B6660]">
        <input v-model="showArchived" type="checkbox" class="accent-[#153131]" />
        Archiváltak mutatása
      </label>
    </div>

    <!-- archivált -->
    <div v-if="showArchived && archived.length" class="mt-4 rounded-xl border border-[#E4E4DE] bg-white p-4">
      <h2 class="font-bold mb-1">Archivált ({{ archived.length }})</h2>
      <p class="text-[#6B6660] text-sm mb-3">
        Ezek nem jelennek meg a weboldalon, de a korábbi foglalások és számlák
        továbbra is hivatkoznak rájuk.
      </p>
      <div v-for="row in archived" :key="String(row.id)" class="flex items-center gap-3 border-t border-[#E4E4DE] py-2.5 opacity-60">
        <span class="font-semibold text-sm">{{ row[def.titleKey] }}</span>
        <button
          class="ml-auto rounded-lg border border-[#E4E4DE] bg-white px-3 py-1.5 text-xs font-semibold"
          @click="restore(row)"
        >
          Visszaállítás
        </button>
      </div>
    </div>

    <!-- szerkesztő -->
    <div
      v-if="editing"
      class="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-[#171008]/50 p-5"
      @click.self="editing = null"
    >
      <div class="w-full max-w-3xl rounded-2xl bg-white p-6">
        <h3 class="font-bold text-[19px]">
          {{ isNew ? `Új ${def.singular}` : `${def.singular} szerkesztése` }}
        </h3>
        <p class="text-[#6B6660] text-sm mb-5">A csillagos mezők kitöltése kötelező.</p>

        <div class="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <div v-for="f in def.fields" :key="f.key" :class="spanClass(f)">
            <label v-if="f.type !== 'bool'" class="mb-1.5 block text-xs font-bold">
              {{ f.label }}<span v-if="f.required"> *</span>
            </label>

            <input
              v-if="f.type === 'text'"
              v-model="editing[f.key] as string"
              type="text"
              class="w-full rounded-lg border px-3 py-2"
              :class="fieldErrors[f.key] ? 'border-[#B3261E]' : 'border-[#E4E4DE]'"
            />

            <input
              v-else-if="f.type === 'number'"
              v-model.number="editing[f.key] as number"
              type="number"
              :min="f.min"
              class="w-full rounded-lg border px-3 py-2"
              :class="fieldErrors[f.key] ? 'border-[#B3261E]' : 'border-[#E4E4DE]'"
            />

            <textarea
              v-else-if="f.type === 'textarea'"
              v-model="editing[f.key] as string"
              :rows="f.rows ?? 3"
              class="w-full rounded-lg border px-3 py-2"
              :class="fieldErrors[f.key] ? 'border-[#B3261E]' : 'border-[#E4E4DE]'"
            />

            <select
              v-else-if="f.type === 'select'"
              v-model="editing[f.key]"
              class="w-full rounded-lg border border-[#E4E4DE] px-3 py-2 bg-white"
            >
              <option v-if="!f.required" :value="null">– nincs –</option>
              <option v-for="o in optionsFor(f)" :key="String(o.value)" :value="o.value">
                {{ o.label }}
              </option>
            </select>

            <label v-else-if="f.type === 'bool'" class="flex items-center gap-2 text-sm font-semibold">
              <input v-model="editing[f.key]" type="checkbox" class="accent-[#153131] w-4 h-4" />
              {{ f.label }}
            </label>

            <div v-else-if="f.type === 'multi'" class="flex flex-wrap gap-2">
              <label
                v-for="o in optionsFor(f)"
                :key="String(o.value)"
                class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                :class="((editing[f.key] as number[]) ?? []).includes(o.value as number)
                  ? 'border-[#153131] bg-[#E5F7F9]'
                  : 'border-[#E4E4DE] bg-white'"
              >
                <input
                  type="checkbox"
                  class="accent-[#153131]"
                  :checked="((editing[f.key] as number[]) ?? []).includes(o.value as number)"
                  @change="toggleMulti(f.key, o.value as number)"
                />
                {{ o.label }}
              </label>
              <span v-if="!optionsFor(f).length" class="text-sm text-[#6B6660]">
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
                  class="flex-1 rounded-lg border border-[#E4E4DE] px-3 py-2"
                />
                <button
                  class="h-9 w-8 rounded-lg border border-[#E4E4DE] text-[#6B6660]"
                  @click="(editing[f.key] as string[]).splice(i, 1)"
                >
                  ✕
                </button>
              </div>
              <button
                class="self-start rounded-lg border border-dashed border-[#E4E4DE] px-3 py-1.5 text-sm font-semibold text-[#153131]"
                @click="(editing[f.key] as string[]).push('')"
              >
                + Bekezdés
              </button>
            </div>

            <p v-if="fieldErrors[f.key]" class="mt-1 text-xs font-semibold text-[#B3261E]">
              {{ fieldErrors[f.key] }}
            </p>
            <p v-else-if="f.hint" class="mt-1 text-xs text-[#6B6660]">{{ f.hint }}</p>
          </div>
        </div>

        <div v-if="warnings.length" class="mt-5 rounded-lg bg-[#FDF3EA] p-3 text-sm text-[#A6541B]">
          <b>Érdemes átnézni</b>
          <ul class="mt-1.5 list-disc pl-5">
            <li v-for="w in warnings" :key="w">{{ w }}</li>
          </ul>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#E4E4DE] pt-4">
          <button
            class="rounded-lg border border-[#E4E4DE] bg-white px-4 py-2.5 text-sm font-semibold"
            @click="editing = null"
          >
            Mégsem
          </button>
          <button
            class="rounded-lg bg-[#153131] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? 'Mentés…' : 'Mentés' }}
          </button>
        </div>
      </div>
    </div>

    <!-- archiválás megerősítése -->
    <div
      v-if="archiving"
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#171008]/50 p-5"
      @click.self="archiving = null"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 class="font-bold text-[19px]">Törlés: {{ archiving[def.titleKey] }}</h3>
        <p class="mt-1 text-sm text-[#6B6660]">
          Ez a {{ def.singular }} azonnal eltűnik a weboldalról és a foglalható listákból.
        </p>
        <div class="mt-4 rounded-lg bg-[#E5F7F9] p-3 text-sm text-[#153131]">
          Fizikai törlés helyett archiválás történik. Amire foglalás vagy számla
          hivatkozik, azt nem lehet valóban törölni – a hivatkozás elszakadna, és
          az elszámolás visszakövethetetlen lenne. Az archivált elem bármikor
          visszaállítható.
        </div>
        <div class="mt-6 flex justify-end gap-2 border-t border-[#E4E4DE] pt-4">
          <button
            class="rounded-lg border border-[#E4E4DE] bg-white px-4 py-2.5 text-sm font-semibold"
            @click="archiving = null"
          >
            Mégsem
          </button>
          <button
            class="rounded-lg border border-[#EED9D7] bg-white px-4 py-2.5 text-sm font-semibold text-[#B3261E]"
            @click="doArchive"
          >
            Törlés
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="toast"
      class="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-[#153131] px-5 py-3 text-sm font-semibold text-white shadow-lg"
    >
      {{ toast }}
    </div>
  </div>
</template>
