<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin'] })

interface Settings {
  holdMinutes: number
  slotGranularityMin: number
  defaultMinLeadTimeHours: number
  defaultMaxLeadTimeDays: number
  freeCancellationHours: number
  allowOnlineCancellation: boolean
  allowOnlineReschedule: boolean
  reminderHoursBefore: number
  smsRemindersEnabled: boolean
  currency: string
  onlinePaymentEnabled: boolean
  cardGuaranteeEnabled: boolean
  noShowFeePercent: number
  invoiceAutoIssue: boolean
  smtpHost: string | null
  smtpPort: number
  smtpUser: string | null
  smtpPass: string | null
  mailFrom: string | null
  smsProvider: string
  smsFrom: string | null
  twilioSid: string | null
  twilioToken: string | null
  ga4MeasurementId: string | null
  gtmContainerId: string | null
  metaPixelId: string | null
  cookieBannerEnabled: boolean
}

const { data, refresh } = await useFetch<{ settings: Settings; providerStatus: { stripeLive: boolean; invoiceLive: boolean } }>(
  '/api/admin/settings',
)
const form = reactive<Partial<Settings>>({})
watchEffect(() => { if (data.value) Object.assign(form, data.value.settings) })

const saving = ref(false)
const toast = ref('')

async function save() {
  saving.value = true
  toast.value = ''
  try {
    await $fetch('/api/admin/settings', { method: 'PUT', body: form })
    toast.value = 'Beállítások mentve.'
    await refresh()
    setTimeout(() => (toast.value = ''), 3500)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    toast.value = err.data?.statusMessage ?? err.statusMessage ?? 'A mentés nem sikerült.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-[760px]">
    <div class="mb-5">
      <h1 class="font-bold text-[24px] tracking-tight">Beállítások</h1>
      <p class="text-[#667085] text-sm mt-0.5">Foglalás, fizetés, számlázás és marketing beállítások.</p>
    </div>

    <div v-if="toast" class="mb-4 rounded-lg bg-[#E9F3F2] text-[#153131] px-4 py-3 text-sm font-semibold">{{ toast }}</div>

    <div class="space-y-5">
      <!-- FIZETÉS -->
      <section class="rounded-xl border border-[#ECEDEF] bg-white p-5 lg:p-6">
        <h2 class="font-bold text-[16px] mb-4">Fizetés</h2>
        <div class="space-y-4">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Online bankkártyás fizetés felkínálása</span>
            <input v-model="form.onlinePaymentEnabled" type="checkbox" class="h-5 w-5 accent-[#153131]" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Kártya-biztosíték bekérése foglaláskor</span>
            <input v-model="form.cardGuaranteeEnabled" type="checkbox" class="h-5 w-5 accent-[#153131]" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">No-show / késői lemondás díja (a szolgáltatás árának %-a)</span>
            <input v-model.number="form.noShowFeePercent" type="number" min="0" max="100"
              class="w-24 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-right focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Pénznem</span>
            <select v-model="form.currency" class="w-32 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none">
              <option value="HUF">HUF (Ft)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </label>
          <p class="text-[13px] text-[#667085] border-t border-[#F0F1F3] pt-3">
            Fizetési szolgáltató:
            <b :class="data?.providerStatus.stripeLive ? 'text-[#1F6B4A]' : 'text-[#B25E09]'">
              {{ data?.providerStatus.stripeLive ? 'Stripe (éles)' : 'Mock (teszt)' }}</b>.
            Az éles működéshez a Stripe kulcsokat a szerver környezeti változóiban (.env) kell megadni – biztonsági okból ezek nem szerkeszthetők a felületről.
          </p>
        </div>
      </section>

      <!-- SZÁMLÁZÁS -->
      <section class="rounded-xl border border-[#ECEDEF] bg-white p-5 lg:p-6">
        <h2 class="font-bold text-[16px] mb-4">Számlázás</h2>
        <div class="space-y-4">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Számla automatikus kiállítása fizetéskor</span>
            <input v-model="form.invoiceAutoIssue" type="checkbox" class="h-5 w-5 accent-[#153131]" />
          </label>
          <p class="text-[13px] text-[#667085] border-t border-[#F0F1F3] pt-3">
            Számlázó szolgáltató:
            <b :class="data?.providerStatus.invoiceLive ? 'text-[#1F6B4A]' : 'text-[#B25E09]'">
              {{ data?.providerStatus.invoiceLive ? 'Számlázz.hu (éles, NAV-beküldéssel)' : 'Mock (teszt)' }}</b>.
            A Számlázz.hu Agent-kulcs a szerver környezeti változóiban (.env) állítandó be.
          </p>
        </div>
      </section>

      <!-- E-MAIL (SMTP) -->
      <section class="rounded-xl border border-[#ECEDEF] bg-white p-5 lg:p-6">
        <h2 class="font-bold text-[16px] mb-1">E-mail küldés (SMTP)</h2>
        <p class="text-[13px] text-[#667085] mb-4">A visszaigazoló, emlékeztető és számla e-mailek küldője. Gmail esetén: host <code>smtp.gmail.com</code>, port <code>587</code>, jelszó = alkalmazásjelszó.</p>
        <div class="space-y-4">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">SMTP host</span>
            <input v-model="form.smtpHost" type="text" placeholder="smtp.gmail.com"
              class="w-64 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Port</span>
            <input v-model.number="form.smtpPort" type="number" min="1" max="65535"
              class="w-24 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-right focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Felhasználó (e-mail)</span>
            <input v-model="form.smtpUser" type="text" autocomplete="off"
              class="w-64 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Jelszó / app-jelszó</span>
            <input v-model="form.smtpPass" type="password" autocomplete="new-password"
              class="w-64 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Feladó (Feladó neve &lt;cím&gt;)</span>
            <input v-model="form.mailFrom" type="text" placeholder="V40 Vital <info@v40vital.hu>"
              class="w-64 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
        </div>
      </section>

      <!-- SMS -->
      <section class="rounded-xl border border-[#ECEDEF] bg-white p-5 lg:p-6">
        <h2 class="font-bold text-[16px] mb-1">SMS emlékeztető</h2>
        <p class="text-[13px] text-[#667085] mb-4">
          Ajánlott szolgáltató: <b>Twilio</b> (megbízható, magyar számok is fogadják). Regisztrálj a twilio.com-on,
          vegyél egy küldő számot, majd add meg az Account SID-et és az Auth Token-t. A „SMS emlékeztető" kapcsoló
          az <b>Emlékeztető</b> szekcióban kapcsolható be.
        </p>
        <div class="space-y-4">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Szolgáltató</span>
            <select v-model="form.smsProvider" class="w-40 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none">
              <option value="NONE">Nincs</option>
              <option value="TWILIO">Twilio</option>
            </select>
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Küldő szám / feladónév</span>
            <input v-model="form.smsFrom" type="text" placeholder="+1..."
              class="w-56 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Twilio Account SID</span>
            <input v-model="form.twilioSid" type="text" autocomplete="off"
              class="w-64 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Twilio Auth Token</span>
            <input v-model="form.twilioToken" type="password" autocomplete="new-password"
              class="w-64 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
        </div>
      </section>

      <!-- FOGLALÁS -->
      <section class="rounded-xl border border-[#ECEDEF] bg-white p-5 lg:p-6">
        <h2 class="font-bold text-[16px] mb-4">Foglalás</h2>
        <div class="space-y-4">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Foglalás fenntartása fizetésig (perc)</span>
            <input v-model.number="form.holdMinutes" type="number" min="1" max="120"
              class="w-24 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-right focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Díjmentes lemondás határa (óra)</span>
            <input v-model.number="form.freeCancellationHours" type="number" min="0" max="720"
              class="w-24 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-right focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Online lemondás engedélyezve</span>
            <input v-model="form.allowOnlineCancellation" type="checkbox" class="h-5 w-5 accent-[#153131]" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Online átfoglalás engedélyezve</span>
            <input v-model="form.allowOnlineReschedule" type="checkbox" class="h-5 w-5 accent-[#153131]" />
          </label>
        </div>
      </section>

      <!-- EMLÉKEZTETŐ -->
      <section class="rounded-xl border border-[#ECEDEF] bg-white p-5 lg:p-6">
        <h2 class="font-bold text-[16px] mb-4">Emlékeztető</h2>
        <div class="space-y-4">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Emlékeztető ennyi órával előtte</span>
            <input v-model.number="form.reminderHoursBefore" type="number" min="0" max="168"
              class="w-24 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-right focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">SMS emlékeztető</span>
            <input v-model="form.smsRemindersEnabled" type="checkbox" class="h-5 w-5 accent-[#153131]" />
          </label>
        </div>
      </section>

      <!-- MARKETING -->
      <section class="rounded-xl border border-[#ECEDEF] bg-white p-5 lg:p-6">
        <h2 class="font-bold text-[16px] mb-4">Marketing / analitika</h2>
        <div class="space-y-4">
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">GA4 Measurement ID</span>
            <input v-model="form.ga4MeasurementId" type="text" placeholder="G-XXXXXXX"
              class="w-56 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">GTM Container ID</span>
            <input v-model="form.gtmContainerId" type="text" placeholder="GTM-XXXXX"
              class="w-56 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Meta Pixel ID</span>
            <input v-model="form.metaPixelId" type="text"
              class="w-56 rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm focus:border-[#153131] outline-none" />
          </label>
          <label class="flex items-center justify-between gap-4">
            <span class="text-sm text-[#344054]">Sütibanner engedélyezve (GDPR)</span>
            <input v-model="form.cookieBannerEnabled" type="checkbox" class="h-5 w-5 accent-[#153131]" />
          </label>
        </div>
      </section>

      <div class="flex justify-end">
        <button class="rounded-lg bg-[#153131] text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
          :disabled="saving" @click="save">
          {{ saving ? 'Mentés…' : 'Mentés' }}
        </button>
      </div>
    </div>
  </div>
</template>
