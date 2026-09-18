<script setup lang="ts">
/**
 * Egyszerű, újrahasználható felugró ablak (modal).
 * Teleporttal a <body> végére kerül, hogy semmilyen szülő túlcsordulás vagy
 * z-index ne vágja le. Bezárás: háttérre kattintás, X gomb vagy Esc.
 */
const open = defineModel<boolean>({ default: false })
defineProps<{ title?: string }>()
const { t } = await useContent()

function close() {
  open.value = false
}

// Esc-re zárás + a háttér görgetésének letiltása, amíg nyitva van.
watch(open, (v) => {
  if (import.meta.client) {
    document.body.style.overflow = v ? 'hidden' : ''
  }
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-6"
        @click.self="close"
      >
        <div class="absolute inset-0 bg-black/50" @click="close" />
        <div
          class="relative bg-white w-full lg:w-[95vw] lg:max-w-[1440px] max-h-[92vh] overflow-y-auto rounded-t-2xl lg:rounded-2xl p-6 lg:p-14 shadow-xl"
          role="dialog"
          aria-modal="true"
        >
          <button
            class="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-[#F4F4F0] text-[#171008] hover:bg-[#E5F7F9] transition-colors"
            :aria-label="t('common.close', 'Bezárás')"
            @click="close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <h3 v-if="title" class="dm-sans font-bold text-[24px] lg:text-[28px] text-[#171008] mb-5 pr-10">
            {{ title }}
          </h3>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
