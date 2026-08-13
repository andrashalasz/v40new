<template>
    <div class="w-full min-h-screen bg-[#F8F8F8] flex justify-center items-center px-4 py-10">
        <div class="w-full max-w-2xl p-6 bg-white shadow-sm rounded-2xl">
            <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center bricolage-grotesque-custom">Új Orvos</h1>
            <form @submit.prevent="addDoctor">
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Név</label>
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
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Profilkép</label>
                    <input type="file" @change="handleFileChange" accept="image/*"
                        class="w-full border border-gray-300 p-3 rounded-lg" required />
                    <div v-if="previewUrl" class="mt-4 text-center">
                        <img :src="previewUrl"
                            class="w-48 h-48 mx-auto object-cover shadow-md" />
                    </div>
                </div>
                <button type="submit" :disabled="submitting"
                    class="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg active:scale-95 disabled:bg-gray-400">
                    {{ submitting ? 'Mentés...' : 'Orvos Mentése' }}
                </button>
                <NuxtLink to="/admin/orvosok" class="block text-center mt-4 text-sm text-gray-500">Mégse</NuxtLink>
            </form>
        </div>
    </div>
</template>

<script setup>
definePageMeta({ middleware: ["admin"] })

const router = useRouter();
const submitting = ref(false);
const selectedFile = ref(null);
const previewUrl = ref(null);
const form = ref({ name: "", desc: "", categ: "" });

const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile.value = file;
        previewUrl.value = URL.createObjectURL(file);
    }
};

const addDoctor = async () => {
    submitting.value = true;
    const fd = new FormData();
    fd.append("name", form.value.name);
    fd.append("desc", form.value.desc);
    fd.append("categ", form.value.categ);
    if (selectedFile.value) fd.append("picUrl", selectedFile.value);

    try {
        const response = await fetch("/api/doctors", { method: "POST", body: fd });
        const res = await response.json();
        if (res.success) router.push('/admin/orvosok');
    } catch (e) { alert("Hiba történt!"); }
    finally { submitting.value = false; }
};
</script>