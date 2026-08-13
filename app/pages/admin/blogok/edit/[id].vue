<template>
  <div class="w-full min-h-screen bg-[#F8F8F8] flex justify-center items-center px-4 py-6">
    <div class="w-full max-w-2xl p-3">
      <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">
        Blog szerkesztése
      </h1>

      <form @submit.prevent="updateBlog" v-if="!loading">
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">Cím</label>
          <input v-model="title" type="text" class="w-full border p-3 rounded-lg" required />
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">Bekezdés (Lead)</label>
          <input v-model="lead" type="text" class="w-full border p-3 rounded-lg" required />
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">Leírás</label>
          <TipTap v-model="description" />
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            Borítókép (Hagyd üresen, ha nem akarod cserélni)
          </label>
          <input type="file" @change="handleFileChange" accept="image/*" class="w-full border p-2 rounded-lg" />

          <div class="mt-4">
            <p class="text-xs text-gray-500 mb-1">Jelenlegi/Új kép:</p>
            <img v-if="previewUrl || currentPicUrl" :src="previewUrl || currentPicUrl"
              class="w-full max-h-64 object-cover rounded-lg border" />
          </div>
        </div>

        <div class="flex gap-4">
          <button type="submit" :disabled="isSubmitting"
            class="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
            {{ isSubmitting ? 'Mentés...' : 'Változtatások mentése' }}
          </button>
          <button type="button" @click="router.push('/admin/blogok')"
            class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100">
            Mégse
          </button>
        </div>
      </form>

      <div v-else class="text-center py-10">Betöltés...</div>
    </div>
  </div>
</template>

<script setup>
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