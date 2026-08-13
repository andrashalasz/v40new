<template>
    <div class="w-full min-h-screen bg-[#F8F8F8] flex justify-center items-center px-4 py-10">
        <div class="w-full max-w-2xl p-6 bg-white shadow-sm rounded-2xl">
            <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center bricolage-grotesque-custom">
                Új Termék / Szolgáltatás
            </h1>
            <form @submit.prevent="addProduct">

                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Megnevezés (Title)</label>
                    <input v-model="form.title" type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        required />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Ár</label>
                        <input v-model="form.price" type="number"
                            class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            required />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Időtartam (opcionális)</label>
                        <input v-model="form.time" type="text"
                            class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Típus</label>
                    <input v-model="form.type" type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        required />
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Leírás (Desc)</label>
                    <input v-model="form.desc" type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        required />
                </div>

                <div class="mb-6">
                    <div>
                        <label class=" +w-full block text-sm font-semibold text-gray-700 mb-2">Nem:</label>
                        <select v-model="form.gender"
                            class="w-full border border-gray-300 p-3 rounded-lg bg-white outline-none">
                            <option value="Mindenki">Mindenki</option>
                            <option value="Férfi">Férfi</option>
                            <option value="Női">Női</option>
                        </select>
                    </div>
                    
                </div>

                <div class="mb-8">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Termék kép</label>
                    <input type="file" @change="handleFileChange" accept="image/*"
                        class="w-full border border-gray-300 p-3 rounded-lg" required />

                    <div v-if="previewUrl" class="mt-4">
                        <p class="text-xs text-gray-500 mb-2 uppercase font-bold">Előnézet:</p>
                        <img :src="previewUrl" class="w-full max-h-64 object-contain rounded-lg border bg-gray-50" />
                    </div>
                </div>

                <button type="submit" :disabled="submitting"
                    class="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg disabled:bg-gray-400">
                    {{ submitting ? 'Mentés...' : 'Termék Mentése' }}
                </button>

                <NuxtLink to="/admin/termekek" class="block text-center mt-4 text-sm text-gray-500">Mégse</NuxtLink>
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

const form = ref({
    title: "", desc: "", type: "", price: "", time: "", gender: "Mindenki"
});

const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile.value = file;
        previewUrl.value = URL.createObjectURL(file);
    }
};

const addProduct = async () => {
    submitting.value = true;
    const fd = new FormData();
    Object.keys(form.value).forEach(key => fd.append(key, form.value[key]));
    if (selectedFile.value) fd.append("picUrl", selectedFile.value);

    try {
        const response = await fetch("/api/products", { method: "POST", body: fd });
        const res = await response.json();
        if (res.success) router.push('/admin/termekek');
    } catch (error) {
        alert("Hiba történt!");
    } finally { submitting.value = false; }
};
</script>