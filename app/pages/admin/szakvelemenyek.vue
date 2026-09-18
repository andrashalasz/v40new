<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

interface Customer { id: number; email: string; name: string }
interface Appt { id: number; startsAt: string; status: string; serviceTitle: string }
interface Doc { id: number; fileName: string; mimeType: string | null; createdAt: string }
interface Opinion { id: number; documentCode: string; title: string; createdAt: string; patientName: string; serviceTitle: string | null }

const { data: customersData } = await useFetch<{ items: Customer[] }>('/api/admin/patients')
const customers = computed(() => customersData.value?.items ?? [])
const { data: opinionsData, refresh: refreshOpinions } = await useFetch<{ items: Opinion[] }>('/api/admin/opinions')
const opinions = computed(() => opinionsData.value?.items ?? [])

const dt = (iso: string) => new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Budapest' }).format(new Date(iso))
const dd = (iso: string) => new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeZone: 'Europe/Budapest' }).format(new Date(iso))
const cName = (c: Customer) => c.name

// --- Új szakvélemény ---
const form = reactive({ userId: 0, appointmentId: 0, title: '', body: '' })
const patient = ref<{ id: number; name: string; birthDate: string | null } | null>(null)
const patientAppts = ref<Appt[]>([])
const patientDocs = ref<Doc[]>([])
const loadingPatient = ref(false)
const saving = ref(false)
const toast = ref('')
const errorMsg = ref('')

async function onPatientChange() {
  form.appointmentId = 0
  patient.value = null
  patientAppts.value = []
  patientDocs.value = []
  if (!form.userId) return
  loadingPatient.value = true
  try {
    const res = await $fetch<{ patient: { id: number; name: string; birthDate: string | null }; appointments: Appt[]; documents: Doc[] }>(`/api/admin/patients/${form.userId}`)
    patient.value = res.patient
    patientAppts.value = res.appointments
    patientDocs.value = res.documents
  } finally {
    loadingPatient.value = false
  }
}

async function save() {
  errorMsg.value = ''
  if (!form.userId || !form.title.trim() || !form.body.trim()) { errorMsg.value = 'Páciens, cím és szöveg megadása kötelező.'; return }
  saving.value = true
  try {
    const res = await $fetch<{ documentCode: string; emailSent: boolean }>('/api/admin/opinions', {
      method: 'POST',
      body: { userId: form.userId, appointmentId: form.appointmentId || undefined, title: form.title, body: form.body },
    })
    toast.value = `Szakvélemény elkészült (${res.documentCode})${res.emailSent ? ' – e-mail elküldve' : ''}.`
    form.title = ''; form.body = ''; form.appointmentId = 0
    await refreshOpinions()
    setTimeout(() => (toast.value = ''), 5000)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    errorMsg.value = err.data?.statusMessage ?? err.statusMessage ?? 'A mentés nem sikerült.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h1 class="font-bold text-[24px] tracking-tight">Szakvélemények</h1>
      <p class="text-[#667085] text-sm mt-0.5">
        Szakvélemény írása regisztrált pácienshez. A dokumentum a páciens fiókjában elérhető, és e-mailben is kimegy
        egy kódolt PDF-fel (a kód a születési évből és a dátumból áll).
      </p>
    </div>

    <div v-if="toast" class="mb-4 rounded-lg bg-[#E9F3F2] text-[#153131] px-4 py-3 text-sm font-semibold">{{ toast }}</div>

    <!-- Új szakvélemény -->
    <div class="rounded-xl border border-[#ECEDEF] bg-white p-5 lg:p-6 mb-6">
      <h2 class="font-bold text-[16px] mb-4">Új szakvélemény</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-[#344054] mb-1">Páciens</label>
          <select v-model.number="form.userId" class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" @change="onPatientChange">
            <option :value="0" disabled>Válassz pácienst…</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ cName(c) }} · {{ c.email }}</option>
          </select>
          <p v-if="patient && !patient.birthDate" class="text-[#B42318] text-[13px] mt-1">
            Ehhez a pácienshez nincs születési dátum rögzítve – enélkül nem képezhető dokumentum-kód.
          </p>
        </div>

        <div v-if="patient">
          <label class="block text-sm font-semibold text-[#344054] mb-1">Kapcsolódó kezelés (opcionális)</label>
          <select v-model.number="form.appointmentId" class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none">
            <option :value="0">— nincs —</option>
            <option v-for="a in patientAppts" :key="a.id" :value="a.id">{{ a.serviceTitle }} · {{ dt(a.startsAt) }}</option>
          </select>
          <p v-if="!patientAppts.length" class="text-[#98A2B3] text-[13px] mt-1">Ehhez a pácienshez nincs rögzített kezelés.</p>
        </div>

        <!-- Páciens dokumentumai (feltöltött leletek) -->
        <div v-if="patient && patientDocs.length" class="rounded-lg border border-[#ECEDEF] bg-[#FAFAFB] p-3">
          <p class="text-[13px] font-semibold text-[#344054] mb-2">A páciens által feltöltött dokumentumok</p>
          <div class="flex flex-col gap-1.5">
            <a v-for="doc in patientDocs" :key="doc.id" :href="`/api/documents/${doc.id}/download`" target="_blank" rel="noopener"
              class="text-[#153131] underline text-[13px]">{{ doc.fileName }} · {{ dd(doc.createdAt) }}</a>
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-[#344054] mb-1">Cím</label>
          <input v-model="form.title" type="text" placeholder="pl. Kardiológiai állapotfelmérés összefoglalója"
            class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-[#344054] mb-1">Szakvélemény szövege</label>
          <textarea v-model="form.body" rows="8" placeholder="A szakvélemény részletes szövege… (üres sor = új bekezdés)"
            class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none resize-y"></textarea>
        </div>

        <p v-if="errorMsg" class="text-[#B42318] text-sm">{{ errorMsg }}</p>
        <div class="flex justify-end">
          <button class="rounded-lg bg-[#153131] text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
            :disabled="saving || !form.userId" @click="save">
            {{ saving ? 'Mentés és küldés…' : 'Mentés és kiküldés' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Kiállított szakvélemények -->
    <div class="rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[#FAFAFB]">
              <th v-for="h in ['Dokumentum-kód', 'Páciens', 'Cím', 'Kezelés', 'Kelt', '']" :key="h"
                class="border-b border-[#ECEDEF] py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#667085] whitespace-nowrap">
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F0F1F3]">
            <tr v-for="o in opinions" :key="o.id" class="hover:bg-[#FAFAFB] transition-colors">
              <td class="py-3 px-4 font-mono text-[13px] whitespace-nowrap">{{ o.documentCode }}</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ o.patientName }}</td>
              <td class="py-3 px-4 text-[#101828]">{{ o.title }}</td>
              <td class="py-3 px-4 text-[#475467]">{{ o.serviceTitle || '—' }}</td>
              <td class="py-3 px-4 text-[#475467] whitespace-nowrap">{{ dd(o.createdAt) }}</td>
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <a :href="`/api/opinions/${o.id}/pdf`" target="_blank" rel="noopener" class="text-[#153131] underline text-xs font-semibold">PDF</a>
              </td>
            </tr>
            <tr v-if="!opinions.length">
              <td colspan="6" class="py-10 px-4 text-center text-[#667085]">Még nincs kiállított szakvélemény.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
