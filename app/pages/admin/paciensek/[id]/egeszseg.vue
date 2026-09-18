<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

/**
 * Egy páciens egészségügyi adatai az orvosnak.
 *
 * Amit ez a képernyő szándékosan NEM tesz: nem minősíti az értékeket, és nem
 * javasol kezelést. Számot, trendet és eltérést mutat – az ok-okozat megítélése
 * az orvos dolga. Ha a rendszer mondana véleményt, orvostechnikai eszközzé
 * válna (EU MDR), ami engedélyezési kötelezettséggel járna.
 */

type Point = { day: string; value: number; min: number | null; max: number | null; count: number }

type Comparison = {
  before: { from: string | null; to: string | null; average: number | null; dayCount: number }
  after: { from: string | null; to: string | null; average: number | null; dayCount: number }
  delta: number | null
  deltaPercent: number | null
  reliable: boolean
}

type Metric = {
  key: string
  label: string
  unit: string
  chart: 'bars' | 'range' | 'line'
  decimals: number
  reference: { min?: number; max?: number; note?: string } | null
  points: Point[]
  summary: {
    latest: number | null
    latestDay: string | null
    average: number | null
    min: number
    max: number
    dayCount: number
    trendPercent: number | null
  }
  comparison: Comparison | null
}

type Category = {
  key: string
  label: string
  consent: { granted: boolean; grantedAt: string; revokedAt: string | null } | null
  metrics: Metric[]
}

type Payload = {
  patient: { id: number; firstName: string | null; lastName: string | null; email: string; birthDate: string | null }
  days: number
  sync: { platform: string; lastSyncedDay: string | null; lastSyncAt: string }[]
  treatments: { id: number; startsAt: string; service: { title: string }; practitioner: { name: string } | null }[]
  compare: { appointmentId: number; day: string; windowDays: number; title: string; practitioner: string | null } | null
  categories: Category[]
}

const route = useRoute()
const id = computed(() => Number(route.params.id))

const days = ref(90)
const compareId = ref<number | null>(null)
const windowDays = ref(14)

const url = computed(() => {
  const p = new URLSearchParams({ days: String(days.value) })
  if (compareId.value) {
    p.set('compare', String(compareId.value))
    p.set('window', String(windowDays.value))
  }
  return `/api/admin/patients/${id.value}/health?${p}`
})

const { data, status, error } = await useFetch<Payload>(url)

const RANGES = [
  { days: 30, label: '30 nap' },
  { days: 90, label: '3 hónap' },
  { days: 180, label: '6 hónap' },
  { days: 365, label: '1 év' },
]

const WINDOWS = [7, 14, 30]

/** Melyik kategória van nyitva. Alapból az első, amiben van adat. */
const openCategory = ref<string | null>(null)
watchEffect(() => {
  if (openCategory.value) return
  const first = data.value?.categories.find((c) => c.metrics.length)
  if (first) openCategory.value = first.key
})

const patientName = computed(() => {
  const p = data.value?.patient
  return [p?.lastName, p?.firstName].filter(Boolean).join(' ') || p?.email || '—'
})

const num = (v: number | null | undefined, decimals = 0) =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('hu-HU', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(v)

const pct = (v: number | null) =>
  v === null ? '—' : `${v > 0 ? '+' : ''}${new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 }).format(v)}%`

const d = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeZone: 'Europe/Budapest' }).format(new Date(iso))
    : '—'

const dt = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Budapest' }).format(
    new Date(iso),
  )

/**
 * A változás iránya – szándékosan SEMLEGES jelölés.
 *
 * Nem színezzük zöldre/pirosra, mert az értékelés lenne: a csökkenő nyugalmi
 * pulzus általában kedvező, a csökkenő izomtömeg nem. Hogy melyik mit jelent,
 * azt az orvos tudja, nem a szoftver.
 */
const arrow = (v: number | null) => (v === null ? '' : v > 0 ? '▲' : v < 0 ? '▼' : '=')
</script>

<template>
  <div>
    <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="font-bold text-[24px] tracking-tight">Egészségügyi adatok</h1>
        <p class="text-[#667085] text-sm mt-0.5">
          {{ patientName }} – a páciens telefonjáról szinkronizált adatok.
        </p>
      </div>
      <NuxtLink
        :to="`/admin/ugyfelek`"
        class="text-sm px-3 py-2 rounded-lg border border-[#ECEDEF] hover:bg-[#F9FAFB]"
      >
        Vissza
      </NuxtLink>
    </div>

    <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>

    <div v-else-if="error" class="p-4 rounded-xl border border-[#FDA29B] bg-[#FFFBFA] text-[#B42318] text-sm">
      Az adatok betöltése nem sikerült: {{ error.statusMessage ?? error.message }}
    </div>

    <template v-else-if="data">
      <!-- Szinkron állapota -->
      <div class="mb-4 flex flex-wrap gap-2 text-xs text-[#667085]">
        <span v-if="!data.sync.length" class="px-2.5 py-1.5 rounded-lg bg-[#F9FAFB] border border-[#ECEDEF]">
          Ez a páciens még nem kapcsolt össze eszközt.
        </span>
        <span
          v-for="s in data.sync"
          :key="s.platform"
          class="px-2.5 py-1.5 rounded-lg bg-[#F9FAFB] border border-[#ECEDEF]"
        >
          {{ s.platform === 'ios' ? 'Apple Health' : 'Health Connect' }} · utolsó adat:
          {{ d(s.lastSyncedDay) }}
        </span>
      </div>

      <!-- Szűrők -->
      <div class="mb-5 rounded-xl border border-[#ECEDEF] bg-white p-4">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div class="flex items-center gap-2">
            <span class="text-sm text-[#667085]">Időszak:</span>
            <button
              v-for="r in RANGES"
              :key="r.days"
              class="text-sm px-3 py-1.5 rounded-lg border"
              :class="days === r.days
                ? 'bg-[#153131] border-[#153131] text-white font-medium'
                : 'border-[#ECEDEF] hover:bg-[#F9FAFB]'"
              @click="days = r.days"
            >{{ r.label }}</button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm text-[#667085]">Kezelés előtte/utána:</span>
            <select
              v-model="compareId"
              class="text-sm px-3 py-1.5 rounded-lg border border-[#ECEDEF] bg-white max-w-[320px]"
            >
              <option :value="null">Nincs összehasonlítás</option>
              <option v-for="t in data.treatments" :key="t.id" :value="t.id">
                {{ dt(t.startsAt) }} – {{ t.service.title }}
              </option>
            </select>

            <!-- Az ablak-gombok egy csoportban maradnak: külön tördelve a
                 "7 nap / 14 nap / 30 nap" hármas szétesne, és nem látszana,
                 hogy egyetlen választás három lehetősége. -->
            <div v-if="compareId" class="flex items-center gap-2 whitespace-nowrap">
              <span class="text-sm text-[#667085]">Ablak:</span>
              <button
                v-for="w in WINDOWS"
                :key="w"
                class="text-sm px-2.5 py-1.5 rounded-lg border"
                :class="windowDays === w
                  ? 'bg-[#153131] border-[#153131] text-white font-medium'
                  : 'border-[#ECEDEF] hover:bg-[#F9FAFB]'"
                @click="windowDays = w"
              >{{ w }} nap</button>
            </div>
          </div>
        </div>

        <p v-if="data.compare" class="mt-3 text-xs text-[#667085]">
          Összehasonlítás:
          <strong>{{ data.compare.title }}</strong> ({{ d(data.compare.day) }}) előtti és utáni
          {{ data.compare.windowDays }} nap. A kezelés napja egyik oldalba sem számít bele.
          Az eltérés leíró adat – az ok-okozati összefüggés megítélése orvosi feladat.
        </p>
      </div>

      <!-- Kategória-fülek -->
      <div class="mb-4 flex flex-wrap gap-2">
        <button
          v-for="c in data.categories"
          :key="c.key"
          class="text-sm px-3.5 py-2 rounded-lg border"
          :class="openCategory === c.key
            ? 'bg-[#153131] border-[#153131] text-white font-medium'
            : 'border-[#ECEDEF] hover:bg-[#F9FAFB]'"
          :disabled="!c.metrics.length"
          @click="openCategory = c.key"
        >
          {{ c.label }}
          <span v-if="!c.metrics.length" class="opacity-50">(nincs adat)</span>
        </button>
      </div>

      <template v-for="c in data.categories" :key="c.key">
        <div v-if="openCategory === c.key">
          <!-- Hozzájárulás állapota: az orvosnak tudnia kell, miért hiányzik adat -->
          <div
            v-if="!c.consent || !c.consent.granted"
            class="mb-4 p-3 rounded-xl border border-[#FEC84B] bg-[#FFFCF5] text-[#B54708] text-sm"
          >
            <template v-if="!c.consent">
              A páciens ehhez az adatkörhöz nem adott hozzájárulást.
            </template>
            <template v-else>
              A hozzájárulás visszavonva {{ d(c.consent.revokedAt) }}-n. Az alábbi adatok a
              visszavonás előtti időszakból származnak.
            </template>
          </div>

          <div v-if="!c.metrics.length" class="p-8 text-center text-[#667085] text-sm rounded-xl border border-[#ECEDEF] bg-white">
            Ebben a kategóriában nincs adat a vizsgált időszakban.
          </div>

          <div
            v-for="m in c.metrics"
            :key="m.key"
            class="mb-4 rounded-xl border border-[#ECEDEF] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 class="font-semibold text-[17px]">{{ m.label }}</h2>
                <p class="text-xs text-[#667085] mt-0.5">
                  {{ m.summary.dayCount }} napnyi adat · mértékegység: {{ m.unit }}
                </p>
              </div>

              <div class="flex flex-wrap gap-5 text-right">
                <div>
                  <p class="text-xs text-[#667085]">Legutóbbi</p>
                  <p class="font-semibold tabular-nums">
                    {{ num(m.summary.latest, m.decimals) }}
                    <span class="font-normal text-[#667085] text-xs">{{ m.unit }}</span>
                  </p>
                </div>
                <div>
                  <p class="text-xs text-[#667085]">Átlag</p>
                  <p class="font-semibold tabular-nums">{{ num(m.summary.average, m.decimals) }}</p>
                </div>
                <div>
                  <p class="text-xs text-[#667085]">Tartomány</p>
                  <p class="font-semibold tabular-nums">
                    {{ num(m.summary.min, m.decimals) }}–{{ num(m.summary.max, m.decimals) }}
                  </p>
                </div>
                <div v-if="m.summary.trendPercent !== null">
                  <p class="text-xs text-[#667085]">Trend</p>
                  <p class="font-semibold tabular-nums">
                    {{ arrow(m.summary.trendPercent) }} {{ pct(m.summary.trendPercent) }}
                  </p>
                </div>
              </div>
            </div>

            <HealthChart
              :points="m.points"
              :chart="m.chart"
              :unit="m.unit"
              :decimals="m.decimals"
              :reference="m.reference"
            />

            <p v-if="m.reference?.note" class="mt-2 text-xs text-[#667085]">
              {{ m.reference.note }}
            </p>

            <!-- Kezelés előtti / utáni -->
            <div v-if="m.comparison" class="mt-4 pt-4 border-t border-[#ECEDEF]">
              <div class="flex flex-wrap items-center gap-6">
                <div>
                  <p class="text-xs text-[#667085]">Kezelés előtt</p>
                  <p class="font-semibold tabular-nums">
                    {{ num(m.comparison.before.average, m.decimals) }}
                    <span class="font-normal text-[#667085] text-xs">
                      ({{ m.comparison.before.dayCount }} nap)
                    </span>
                  </p>
                </div>
                <div class="text-[#667085]">→</div>
                <div>
                  <p class="text-xs text-[#667085]">Kezelés után</p>
                  <p class="font-semibold tabular-nums">
                    {{ num(m.comparison.after.average, m.decimals) }}
                    <span class="font-normal text-[#667085] text-xs">
                      ({{ m.comparison.after.dayCount }} nap)
                    </span>
                  </p>
                </div>
                <div>
                  <p class="text-xs text-[#667085]">Eltérés</p>
                  <p class="font-semibold tabular-nums">
                    {{ arrow(m.comparison.delta) }}
                    {{ num(m.comparison.delta, m.decimals) }} {{ m.unit }}
                    <span v-if="m.comparison.deltaPercent !== null" class="text-[#667085] font-normal">
                      ({{ pct(m.comparison.deltaPercent) }})
                    </span>
                  </p>
                </div>
              </div>

              <p v-if="!m.comparison.reliable" class="mt-2 text-xs text-[#B54708]">
                Kevés napra van adat valamelyik időszakban – az eltérés tájékoztató jellegű.
              </p>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
