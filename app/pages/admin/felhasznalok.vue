<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

interface UserRow {
  id: number; email: string; name: string; phone: string | null; role: string
  isActive: boolean; birthDate: string | null; hasPassword: boolean
  appointmentCount: number; patientCount: number; createdAt: string
}

const roleFilter = ref<'USER' | 'DOCTOR' | 'STAFF' | 'ADMIN'>('USER')
const { data, refresh, status } = await useFetch<{ items: UserRow[] }>('/api/admin/users', { query: { role: roleFilter } })
const items = computed(() => data.value?.items ?? [])
const { data: doctorsData } = await useFetch<{ items: { id: number; name: string }[] }>('/api/admin/doctors')
const doctors = computed(() => doctorsData.value?.items ?? [])

const dd = (iso: string | null) => iso ? new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeZone: 'Europe/Budapest' }).format(new Date(iso)) : '—'
const dt = (iso: string) => new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Budapest' }).format(new Date(iso))
const huf = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'
const toast = ref('')
function flash(m: string) { toast.value = m; setTimeout(() => (toast.value = ''), 3500) }

// --- Új felhasználó ---
const showNew = ref(false)
const nf = reactive({ email: '', lastName: '', firstName: '', phone: '', birthDate: '', role: 'USER' as 'USER' | 'DOCTOR' | 'STAFF' | 'ADMIN', password: '' })
const nfErr = ref('')
const creating = ref(false)
function openNew() { Object.assign(nf, { email: '', lastName: '', firstName: '', phone: '', birthDate: '', role: roleFilter.value, password: '' }); nfErr.value = ''; showNew.value = true }
async function createUser() {
  creating.value = true; nfErr.value = ''
  try {
    await $fetch('/api/admin/users', { method: 'POST', body: {
      email: nf.email, lastName: nf.lastName || undefined, firstName: nf.firstName || undefined,
      phone: nf.phone || undefined, birthDate: nf.birthDate || undefined, role: nf.role,
      password: nf.password || undefined,
    } })
    showNew.value = false; flash('Felhasználó létrehozva.'); await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    nfErr.value = err.data?.statusMessage ?? err.statusMessage ?? 'A létrehozás nem sikerült.'
  } finally { creating.value = false }
}

// --- Szerkesztés (e-mail, szerepkör, jelszó) ---
const showEdit = ref(false)
const ef = reactive({
  id: 0, email: '', lastName: '', firstName: '', phone: '', birthDate: '',
  role: 'USER' as 'USER' | 'DOCTOR' | 'STAFF' | 'ADMIN', password: '',
})
const efErr = ref('')
const saving = ref(false)

function openEdit(u: UserRow) {
  const [lastName = '', ...rest] = (u.name || '').split(' ')
  Object.assign(ef, {
    id: u.id, email: u.email, lastName, firstName: rest.join(' '),
    phone: u.phone ?? '', role: u.role as typeof ef.role, password: '',
    // A dátum ISO alakban érkezik; a <input type="date"> csak az első 10
    // karaktert (ÉÉÉÉ-HH-NN) érti – enélkül üresen maradna a mező.
    birthDate: u.birthDate ? String(u.birthDate).slice(0, 10) : '',
  })
  efErr.value = ''
  showEdit.value = true
}

async function saveEdit() {
  saving.value = true; efErr.value = ''
  try {
    await $fetch(`/api/admin/users/${ef.id}`, { method: 'PATCH', body: {
      email: ef.email,
      lastName: ef.lastName || null,
      firstName: ef.firstName || null,
      phone: ef.phone || null,
      birthDate: ef.birthDate || null,
      role: ef.role,
      // Üres mező = nem módosítjuk a jelszót.
      password: ef.password || undefined,
    } })
    showEdit.value = false; flash('Mentve.'); await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    efErr.value = err.data?.statusMessage ?? err.statusMessage ?? 'A mentés nem sikerült.'
  } finally { saving.value = false }
}

/**
 * Törlés – a szerver utasítja vissza, ha bármi kapcsolódik a felhasználóhoz,
 * és meg is mondja, mi. Ezt az üzenetet mutatjuk, mert az a hasznos
 * információ, nem egy általános "nem sikerült".
 */
async function removeUser(u: UserRow) {
  if (!confirm(`Biztosan törlöd? ${u.email}\n\nEz nem vonható vissza.`)) return
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
    flash('Törölve.'); await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    alert(err.data?.statusMessage ?? err.statusMessage ?? 'A törlés nem sikerült.')
  }
}

async function toggleActive(u: UserRow) {
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { isActive: !u.isActive } })
    await refresh(); flash(u.isActive ? 'Deaktiválva.' : 'Aktiválva.')
  } catch { flash('A művelet nem sikerült.') }
}

// --- Adatlap (detail) ---
interface Detail {
  user: { id: number; name: string; email: string; phone: string | null; role: string; isActive: boolean; birthDate: string | null; createdAt: string }
  appointments: { publicRef: string; startsAt: string; status: string; serviceTitle: string; practitionerName: string; priceGross: number }[]
  passes: { code: string; status: string; title: string; sessionsRemaining: number | null; sessionsTotal: number | null; validUntil: string }[]
  opinions: { id: number; documentCode: string; title: string; createdAt: string }[]
  documents: { id: number; fileName: string; createdAt: string }[]
  doctors: { id: number; name: string }[]
  questionnaires: { id: number; type: string; answers: Record<string, unknown>; createdAt: string }[]
}
function fmtAnswer(v: unknown): string { return Array.isArray(v) ? v.join(', ') : String(v) }
const detail = ref<Detail | null>(null)
const detailOpen = ref(false)
const assignDoctorId = ref(0)
async function openDetail(id: number) {
  detail.value = null; detailOpen.value = true; assignDoctorId.value = 0
  detail.value = await $fetch<Detail>(`/api/admin/users/${id}`)
}
async function assign(action: 'add' | 'remove', doctorId: number) {
  if (!detail.value || !doctorId) return
  await $fetch(`/api/admin/users/${detail.value.user.id}/assign`, { method: 'POST', body: { doctorId, action } })
  detail.value = await $fetch<Detail>(`/api/admin/users/${detail.value.user.id}`)
  assignDoctorId.value = 0
}

const roleLabel: Record<string, string> = { USER: 'Páciens', DOCTOR: 'Orvos', STAFF: 'Munkatárs', ADMIN: 'Admin' }
</script>

<template>
  <div>
    <div class="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 class="font-bold text-[24px] tracking-tight">Felhasználók</h1>
        <p class="text-[#667085] text-sm mt-0.5">Páciensek és orvosok kezelése: felvitel, aktiválás, adatlap, orvos-hozzárendelés.</p>
      </div>
      <button class="rounded-lg bg-[#153131] text-white px-4 py-2.5 text-sm font-semibold shrink-0" @click="openNew">+ Új felhasználó</button>
    </div>

    <div v-if="toast" class="mb-4 rounded-lg bg-[#E9F3F2] text-[#153131] px-4 py-3 text-sm font-semibold">{{ toast }}</div>

    <div class="flex gap-2 mb-4">
      <button v-for="r in (['USER','DOCTOR','STAFF','ADMIN'] as const)" :key="r"
        class="px-3.5 py-2 rounded-lg text-sm font-semibold border"
        :class="roleFilter === r ? 'bg-[#153131] border-[#153131] text-white' : 'bg-white border-[#ECEDEF] text-[#667085]'"
        @click="roleFilter = r">{{ roleLabel[r] }}</button>
    </div>

    <div class="rounded-xl border border-[#ECEDEF] bg-white overflow-hidden">
      <div v-if="status === 'pending'" class="p-8 text-center text-[#667085] text-sm">Betöltés…</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FAFAFB]">
              <th v-for="h in ['Név', 'E-mail', 'Telefon', roleFilter === 'DOCTOR' ? 'Páciens' : 'Foglalás', 'Állapot', '']" :key="h"
                class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] whitespace-nowrap">{{ h }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F0F1F3]">
            <tr v-for="u in items" :key="u.id" class="hover:bg-[#FAFAFB]">
              <td class="py-3 px-4 font-semibold text-[#101828] whitespace-nowrap">{{ u.name }}</td>
              <td class="py-3 px-4 text-[#475467]">{{ u.email }}</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ u.phone || '—' }}</td>
              <td class="py-3 px-4 text-[#475467]">{{ roleFilter === 'DOCTOR' ? u.patientCount : u.appointmentCount }}</td>
              <td class="py-3 px-4">
                <span :class="u.isActive ? 'bg-[#E9F3F2] text-[#153131]' : 'bg-[#FBE9E9] text-[#B42318]'" class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {{ u.isActive ? 'Aktív' : 'Inaktív' }}
                </span>
              </td>
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <button class="text-[#153131] underline text-xs font-semibold mr-3" @click="openDetail(u.id)">Adatlap</button>
                <button class="text-[#153131] underline text-xs font-semibold mr-3" @click="openEdit(u)">Szerkeszt</button>
                <button class="text-xs font-semibold mr-3" :class="u.isActive ? 'text-[#B42318]' : 'text-[#1F6B4A]'" @click="toggleActive(u)">
                  {{ u.isActive ? 'Deaktivál' : 'Aktivál' }}
                </button>
                <!-- A törlés csak akkor sikerül, ha semmi nem kapcsolódik a
                     felhasználóhoz; ezt a SZERVER dönti el, nem a felület. -->
                <button class="text-xs font-semibold text-[#B42318]" @click="removeUser(u)">Törlés</button>
              </td>
            </tr>
            <tr v-if="!items.length"><td colspan="6" class="py-10 px-4 text-center text-[#667085]">Nincs találat.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Szerkesztés: e-mail, szerepkör, jelszó -->
    <div v-if="showEdit" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" @click.self="showEdit = false">
      <div class="w-full max-w-[480px] my-8 rounded-xl bg-white p-6 shadow-xl">
        <h2 class="font-bold text-[19px] mb-4">Felhasználó szerkesztése</h2>
        <div class="space-y-3">
          <label class="block text-sm font-semibold text-[#344054]">Szerep
            <select v-model="ef.role" class="mt-1 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm font-normal">
              <option value="USER">Páciens</option><option value="DOCTOR">Orvos</option><option value="STAFF">Munkatárs</option><option value="ADMIN">Admin</option>
            </select>
          </label>
          <div class="flex gap-3">
            <input v-model="ef.lastName" placeholder="Vezetéknév" class="flex-1 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
            <input v-model="ef.firstName" placeholder="Keresztnév" class="flex-1 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
          </div>
          <label class="block text-sm text-[#344054]">E-mail (ezzel lép be)
            <input v-model="ef.email" type="email" class="mt-1 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
          </label>
          <input v-model="ef.phone" placeholder="Telefonszám" class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
          <label class="block text-sm text-[#344054]">Születési dátum
            <input v-model="ef.birthDate" type="date" class="mt-1 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
            <span class="block text-xs text-[#667085] mt-1">
              A szakvélemény dokumentum-kódja ebből és a dokumentum dátumából áll össze.
            </span>
          </label>
          <label class="block text-sm text-[#344054]">Új jelszó (üresen hagyva marad a régi)
            <input v-model="ef.password" type="password" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
          </label>
          <p class="text-[#667085] text-xs">
            Az e-mail, a szerepkör vagy a jelszó módosítása után az érintett mobil eszközei kijelentkeznek.
          </p>
          <p v-if="efErr" class="text-[#B42318] text-sm">{{ efErr }}</p>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 text-sm font-semibold text-[#475467]" @click="showEdit = false">Mégse</button>
          <button class="rounded-lg bg-[#153131] text-white px-4 py-2 text-sm font-semibold disabled:opacity-60" :disabled="saving" @click="saveEdit">
            {{ saving ? 'Mentés…' : 'Mentés' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Új felhasználó modál -->
    <div v-if="showNew" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" @click.self="showNew = false">
      <div class="w-full max-w-[480px] my-8 rounded-xl bg-white p-6 shadow-xl">
        <h2 class="font-bold text-[19px] mb-4">Új felhasználó</h2>
        <div class="space-y-3">
          <div class="flex gap-3">
            <label class="flex-1 text-sm font-semibold text-[#344054]">Szerep
              <select v-model="nf.role" class="mt-1 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm font-normal">
                <option value="USER">Páciens</option><option value="DOCTOR">Orvos</option><option value="STAFF">Munkatárs</option><option value="ADMIN">Admin</option>
              </select>
            </label>
          </div>
          <div class="flex gap-3">
            <input v-model="nf.lastName" placeholder="Vezetéknév" class="flex-1 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
            <input v-model="nf.firstName" placeholder="Keresztnév" class="flex-1 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
          </div>
          <input v-model="nf.email" type="email" placeholder="E-mail" class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
          <input v-model="nf.phone" placeholder="Telefonszám" class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
          <label class="block text-sm text-[#344054]">Születési dátum {{ nf.role === 'USER' ? '(szakvéleményhez ajánlott)' : '' }}
            <input v-model="nf.birthDate" type="date" class="mt-1 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
          </label>
          <label class="block text-sm text-[#344054]">Jelszó {{ nf.role === 'USER' ? '(opcionális)' : '(kötelező – belép a felületre)' }}
            <input v-model="nf.password" type="password" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm" />
          </label>
          <p v-if="nfErr" class="text-[#B42318] text-sm">{{ nfErr }}</p>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 text-sm font-semibold text-[#475467]" @click="showNew = false">Mégse</button>
          <button class="rounded-lg bg-[#153131] text-white px-4 py-2 text-sm font-semibold disabled:opacity-60" :disabled="creating" @click="createUser">
            {{ creating ? 'Létrehozás…' : 'Létrehozás' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Adatlap modál -->
    <div v-if="detailOpen" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" @click.self="detailOpen = false">
      <div class="w-full max-w-[680px] my-8 rounded-xl bg-white p-6 lg:p-7 shadow-xl">
        <div v-if="!detail" class="py-10 text-center text-[#667085]">Betöltés…</div>
        <template v-else>
          <div class="flex items-start justify-between mb-4">
            <div>
              <h2 class="font-bold text-[20px]">{{ detail.user.name }}</h2>
              <p class="text-[#667085] text-sm">{{ detail.user.email }} · {{ roleLabel[detail.user.role] }} · szül. {{ dd(detail.user.birthDate) }}</p>
            </div>
            <button class="text-[#00000060] text-[22px] leading-none" @click="detailOpen = false">×</button>
          </div>

          <!-- Orvos-hozzárendelés (csak ügyfélnél) -->
          <div v-if="detail.user.role === 'USER'" class="rounded-lg border border-[#ECEDEF] p-4 mb-4">
            <p class="text-sm font-semibold mb-2">Hozzárendelt orvosok</p>
            <div class="flex flex-wrap gap-2 mb-3">
              <span v-for="doc in detail.doctors" :key="doc.id" class="inline-flex items-center gap-1.5 bg-[#E9F3F2] text-[#153131] rounded-full px-3 py-1 text-xs font-semibold">
                {{ doc.name }}
                <button class="text-[#B42318]" @click="assign('remove', doc.id)">×</button>
              </span>
              <span v-if="!detail.doctors.length" class="text-[#98A2B3] text-sm">Nincs hozzárendelt orvos.</span>
            </div>
            <div class="flex gap-2">
              <select v-model.number="assignDoctorId" class="flex-1 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm">
                <option :value="0" disabled>Orvos kiválasztása…</option>
                <option v-for="doc in doctors" :key="doc.id" :value="doc.id">{{ doc.name }}</option>
              </select>
              <button class="rounded-lg bg-[#153131] text-white px-4 py-2 text-sm font-semibold disabled:opacity-60" :disabled="!assignDoctorId" @click="assign('add', assignDoctorId)">Hozzárendel</button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-semibold mb-2">Kezelés-történet ({{ detail.appointments.length }})</p>
              <div class="space-y-1.5 max-h-[220px] overflow-y-auto">
                <div v-for="a in detail.appointments" :key="a.publicRef" class="text-[13px] text-[#475467]">
                  {{ dt(a.startsAt) }} · <b>{{ a.serviceTitle }}</b> · {{ a.status }} · {{ huf(a.priceGross) }}
                </div>
                <p v-if="!detail.appointments.length" class="text-[#98A2B3] text-sm">Nincs foglalás.</p>
              </div>
            </div>
            <div>
              <p class="text-sm font-semibold mb-2">Dokumentumok ({{ detail.documents.length }})</p>
              <div class="space-y-1.5 max-h-[220px] overflow-y-auto">
                <a v-for="doc in detail.documents" :key="doc.id" :href="`/api/documents/${doc.id}/download`" target="_blank" rel="noopener" class="block text-[13px] text-[#153131] underline">{{ doc.fileName }} · {{ dd(doc.createdAt) }}</a>
                <p v-if="!detail.documents.length" class="text-[#98A2B3] text-sm">Nincs dokumentum.</p>
              </div>
              <p class="text-sm font-semibold mt-4 mb-2">Szakvélemények ({{ detail.opinions.length }})</p>
              <div class="space-y-1.5">
                <a v-for="o in detail.opinions" :key="o.id" :href="`/api/opinions/${o.id}/pdf`" target="_blank" rel="noopener" class="block text-[13px] text-[#153131] underline">{{ o.title }} · {{ o.documentCode }}</a>
                <p v-if="!detail.opinions.length" class="text-[#98A2B3] text-sm">Nincs szakvélemény.</p>
              </div>
            </div>
          </div>

          <!-- Kitöltött kérdőívek -->
          <div v-if="detail.questionnaires.length" class="mt-4">
            <p class="text-sm font-semibold mb-2">Kitöltött kérdőívek ({{ detail.questionnaires.length }})</p>
            <details v-for="q in detail.questionnaires" :key="q.id" class="rounded-lg border border-[#ECEDEF] mb-2">
              <summary class="cursor-pointer px-3 py-2 text-[13px] font-semibold">{{ q.type }} kérdőív · {{ dd(q.createdAt) }}</summary>
              <div class="px-3 pb-3 grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1">
                <div v-for="(v, k) in q.answers" :key="k" class="text-[12px] text-[#475467]">
                  <span class="text-[#98A2B3]">{{ k }}:</span> {{ fmtAnswer(v) }}
                </div>
              </div>
            </details>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
