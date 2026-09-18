<template>
  <div>
    <div class="mb-5 flex items-center gap-3">
      <NuxtLink to="/admin/blogok" class="text-[#667085] hover:text-[#101828] transition-colors">
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </NuxtLink>
      <h1 class="font-bold text-[24px] tracking-tight">Bejegyzés szerkesztése</h1>
    </div>
    <div class="max-w-3xl rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-6">
      <form v-if="!loading" class="flex flex-col gap-5" @submit.prevent="updateBlog">
        <div>
          <label class="block text-[13px] font-semibold text-[#344054] mb-1.5">Cím</label>
          <input v-model="title" type="text" required
            class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm outline-none focus:border-[#153131] focus:ring-2 focus:ring-[#153131]/15 transition-shadow" />
        </div>
        <div>
          <label class="block text-[13px] font-semibold text-[#344054] mb-1.5">Bevezető</label>
          <input v-model="lead" type="text" required
            class="w-full rounded-lg border border-[#D0D5DD] px-3 py-2.5 text-sm outline-none focus:border-[#153131] focus:ring-2 focus:ring-[#153131]/15 transition-shadow" />
        </div>
        <div>
          <label class="block text-[13px] font-semibold text-[#344054] mb-1.5">Tartalom</label>
          <TipTap v-model="description" />
        </div>
        <div>
          <label class="block text-[13px] font-semibold text-[#344054] mb-1.5">Borítókép (üresen hagyva marad a régi)</label>
          <input type="file" @change="handleFileChange" accept="image/*" class="text-sm" />
          <div v-if="previewUrl || currentPicUrl" class="mt-3">
            <img :src="previewUrl || currentPicUrl" class="w-full max-h-64 object-cover rounded-lg border border-[#ECEDEF]" />
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t border-[#ECEDEF] pt-4">
          <button type="button" class="rounded-lg border border-[#D9DCE1] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors" @click="router.push('/admin/blogok')">
            Mégsem
          </button>
          <button type="submit" :disabled="isSubmitting"
            class="rounded-lg bg-[#153131] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2525] disabled:opacity-40 transition-colors">
            {{ isSubmitting ? 'Mentés…' : 'Mentés' }}
          </button>
        </div>
      </form>
      <div v-else class="text-center py-10 text-[#667085] text-sm">Betöltés…</div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: "admin", middleware: ["admin"] })

const route = useRoute();
const router = useRouter();
const blogId = route.params.id;

// State-ek
const title = ref("");
const lead = ref("");
const description = ref("");
const currentPicUrl = ref(""); // A szerverről jövő régi kép URL-je
const selectedFile = ref(null); // Az új fájl, ha van
const previewUrl = ref(null);   // Az új fájl előnézete
const loading = ref(true);
const isSubmitting = ref(false);

// 1. Adatok betöltése
const loadBlog = async () => {
  try {
    const data = await $fetch(`/api/blogs?id=${blogId}`);
    if (data) {
      title.value = data.title;
      lead.value = data.lead;
      description.value = data.rows;
      currentPicUrl.value = data.picUrl;
    }
  } catch (e) {
    alert("Hiba a blog betöltésekor!");
    router.push('/admin/blogok');
  } finally {
    loading.value = false;
  }
};

// 2. Fájl kiválasztás kezelése
const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Kliens oldali méretellenőrzés (pl. 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert("A kép túl nagy! Max 5MB.");
    event.target.value = "";
    return;
  }

  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
};

// 3. Mentés (PUT)
const updateBlog = async () => {
  isSubmitting.value = true;

  const fd = new FormData();
  fd.append("id", blogId);
  fd.append("title", title.value);
  fd.append("lead", lead.value);
  fd.append("rows", description.value);

  // Csak akkor adjuk hozzá a fájlt, ha a user tényleg választott újat
  if (selectedFile.value) {
    fd.append("picUrl", selectedFile.value);
  }

  try {
    const response = await fetch("/api/blogs", {
      method: "PUT",
      body: fd, // Automatikusan multipart/form-data lesz
    });

    const result = await response.json();

    if (result.success) {
      alert("Sikeresen frissítve!");
      router.push('/admin/blogok');
    } else {
      alert("Hiba: " + result.error);
    }
  } catch (error) {
    console.error("Hiba:", error);
    alert("Hálózati hiba történt!");
  } finally {
    isSubmitting.value = false;
  }
};

loadBlog()
</script>