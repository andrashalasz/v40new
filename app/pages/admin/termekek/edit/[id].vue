<template>
    <div class="w-full min-h-screen bg-[#F8F8F8] flex justify-center items-center px-4 py-10">
        <div class="w-full max-w-2xl p-6 bg-white shadow-sm rounded-2xl border border-gray-100">
            <h1 class="text-3xl font-bold text-gray-800 mb-8 text-center bricolage-grotesque-custom">
                Termék Szerkesztése
            </h1>

            <div v-if="pending" class="text-center py-10 text-gray-500 italic">
                Adatok betöltése...
            </div>

            <form v-else @submit.prevent="updateProduct">
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Megnevezés (Title)</label>
                    <input v-model="form.title" type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Ár</label>
                        <input v-model="form.price" type="text"
                            class="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required />
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Időtartam</label>
                        <input v-model="form.time" type="text"
                            class="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Típus</label>
                    <input v-model="form.type" type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required />
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Leírás</label>
                    <input v-model="form.desc" type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Termék kép cseréje
                        (opcionális)</label>
                    <input type="file" @change="handleFileChange" accept="image/*"
                        class="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />

                    <div class="mt-4">
                        <p class="text-[10px] text-gray-400 uppercase font-bold mb-1 text-center">
                            {{ selectedFile ? 'Új kép előnézete:' : 'Jelenlegi kép:' }}
                        </p>
                        <img :src="previewUrl || form.picUrl" alt="Előnézet"
                            class="w-full max-h-48 object-contain rounded-lg border border-dashed p-2 bg-gray-50 shadow-inner" />
                    </div>
                </div>

                <button type="submit" :disabled="submitting"
                    class="w-full bricolage-grotesque-custom bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg active:scale-95 shadow-blue-200 disabled:bg-gray-400">
                    {{ submitting ? 'Frissítés folyamatban...' : 'Módosítások mentése' }}
                </button>

                <NuxtLink to="/admin/termekek"
                    class="block text-center mt-4 text-sm text-gray-400 hover:text-gray-600 transition">
                    Mégse / Vissza a listához
                </NuxtLink>
            </form>
        </div>
    </div>
</template>

<script setup>
definePageMeta({ middleware: ["admin"] })

definePageMeta({ layout: false });

const route = useRoute();
const router = useRouter();
const productId = route.params.id;

const pending = ref(true);
const submitting = ref(false);
const selectedFile = ref(null);
const previewUrl = ref(null);

const form = ref({
    id: productId,
    title: "",
    desc: "",
    type: "",
    price: "",
    picUrl: "", // Ez tárolja az adatbázisból jövő URL-t
    time: "",
    gender: ""
});

// 1. Adatok betöltése
const loadProduct = async () => {
    try {
        const data = await $fetch(`/api/products?id=${productId}`);
        if (data) {
            form.value.title = data.title;
            form.value.desc = data.desc;
            form.value.type = data.type; // Fontos!
            form.value.price = data.price;
            form.value.picUrl = data.picUrl;
            form.value.time = data.time || "";
            form.value.gender = data.gender || "";
        }
    } catch (e) {
        console.error("Hiba:", e);
        alert("Nem sikerült a termék betöltése.");
    } finally {
        pending.value = false;
    }
};

// 2. Új kép kiválasztása
const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        selectedFile.value = file;
        previewUrl.value = URL.createObjectURL(file);
    }
};

// 3. Mentés (PUT) FormData használatával
const updateProduct = async () => {
    submitting.value = true;
    try {
        const fd = new FormData();
        fd.append("id", productId);
        fd.append("title", form.value.title);
        fd.append("desc", form.value.desc);
        fd.append("type", form.value.type);
        fd.append("price", form.value.price);
        fd.append("gender", form.value.gender);
        fd.append("time", form.value.time || "");

        // Csak akkor küldjük el a picUrl kulcsot fájlként, ha van új fájl
        if (selectedFile.value) {
            fd.append("picUrl", selectedFile.value);
        }

        const response = await fetch("/api/products", {
            method: "PUT",
            body: fd // JSON helyett FormData-t küldünk
        });

        const result = await response.json();

        if (result.success) {
            alert("Sikeresen frissítve!");
            router.push('/admin/termekek');
        } else {
            alert("Hiba: " + result.error);
        }
    } catch (error) {
        console.error("Mentési hiba:", error);
        alert("Hiba történt a mentés során.");
    } finally {
        submitting.value = false;
    }
};

loadProduct()
</script>