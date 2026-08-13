<template>
    <div class="w-full min-h-screen bg-[#F8F8F8] flex justify-center items-center px-4 py-10">
        <div class="w-full max-w-2xl p-6 bg-white shadow-sm rounded-2xl border border-gray-100">
            <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center bricolage-grotesque-custom">Orvos Szerkesztése
            </h1>
            <div v-if="pending" class="text-center py-10 text-gray-500 italic">Adatok betöltése...</div>
            <form v-else @submit.prevent="updateProduct">
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Orvos neve</label>
                    <input v-model="form.name" type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        required />
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Kategória</label>
                    <input v-model="form.categ" type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        required />
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Leírás</label>
                    <input v-model="form.desc" type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        required />
                </div>
                <div class="mb-8">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Profilkép cseréje (opcionális)</label>
                    <input type="file" @change="handleFileChange" accept="image/*"
                        class="w-full border border-gray-300 p-3 rounded-lg outline-none" />
                    <div class="mt-4 text-center">
                        <p class="text-[10px] text-gray-400 uppercase font-bold mb-1">Jelenlegi kép:</p>
                        <img :src="previewUrl || form.picUrl"
                            class="w-48 h-48 mx-auto object-cove p-1 bg-white shadow-sm" />
                    </div>
                </div>
                <button type="submit" :disabled="submitting"
                    class="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg active:scale-95 disabled:bg-gray-400 shadow-blue-200">
                    {{ submitting ? 'Frissítés...' : 'Módosítások mentése' }}
                </button>
                <NuxtLink to="/admin/orvosok"
                    class="block text-center mt-4 text-sm text-gray-400 hover:text-gray-600 transition">Mégse és vissza
                </NuxtLink>
            </form>
        </div>
    </div>
</template>

<script setup>
const route = useRoute();
const router = useRouter();
const pending = ref(true);
const submitting = ref(false);
const selectedFile = ref(null);
const previewUrl = ref(null);
const form = ref({ id: route.params.id, name: "", desc: "", categ: "", picUrl: "" });

const loadDoctor = async () => {
    try {
        const data = await $fetch(`/api/doctors?id=${route.params.id}`);
        if (data) {
            form.value.name = data.name;
            form.value.desc = data.desc;
            form.value.categ = data.category;
            form.value.picUrl = data.picUrl;
        }
    } finally { pending.value = false; }
};

const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile.value = file;
        previewUrl.value = URL.createObjectURL(file);
    }
};

const updateProduct = async () => {
    submitting.value = true;
    const fd = new FormData();
    fd.append("id", form.value.id);
    fd.append("name", form.value.name);
    fd.append("desc", form.value.desc);
    fd.append("categ", form.value.categ);
    if (selectedFile.value) fd.append("picUrl", selectedFile.value);

    try {
        const response = await fetch("/api/doctors", { method: "PUT", body: fd });
        const res = await response.json();
        if (res.success) router.push('/admin/orvosok');
    } catch (e) { alert("Hiba történt!"); }
    finally { submitting.value = false; }
};

loadDoctor();
</script>