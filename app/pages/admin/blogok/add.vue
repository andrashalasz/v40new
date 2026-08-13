<template>
    <div class="w-full min-h-screen bg-[#F8F8F8] flex justify-center items-center px-4 py-6">
        <div class="w-full max-w-2xl p-3">
            <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">Új Blog Feltöltése</h1>
            <form @submit.prevent="uploadBlog">
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Cím</label>
                    <input v-model="title" type="text" class="w-full border p-3 rounded-lg" required />
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Bekezdés</label>
                    <input v-model="lead" type="text" class="w-full border p-3 rounded-lg" required />
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Leírás</label>
                    <TipTap v-model="description" />
                </div>

                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Kép a kártyához</label>
                    <input type="file" @change="handleFileChange($event)" accept="image/*" class="w-full"
                        required />
                    <div v-if="cardPreview" class="mt-3">
                        <img :src="cardPreview" class="w-full max-h-64 object-cover rounded-lg border" />
                    </div>
                </div>
                <button type="submit" class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700">
                    Feltöltés
                </button>
            </form>
        </div>
    </div>
</template>

<script setup>
definePageMeta({ middleware: ["admin"] })

const title = ref("");
const lead = ref("");
const description = ref("");
const cardImageFile = ref(null);
const cardPreview = ref(null);

const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
        cardImageFile.value = file;
        cardPreview.value = URL.createObjectURL(file);
   
};

const uploadBlog = async () => {
    if (!title.value || !cardImageFile.value) {
        alert("Minden mező és kép kötelező!");
        return;
    }

    const formData = new FormData();
    formData.append("title", title.value);
    formData.append("lead", lead.value);
    formData.append("rows", description.value);
    formData.append("picUrl", cardImageFile.value);

    try {
        const response = await fetch("/api/blogs/add", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();
        if (result.success) {
            alert("Sikeres feltöltés!");
            // Form ürítése...
        } else {
            alert("Hiba: " + result.error);
        }
    } catch (error) {
        console.error("Hiba:", error);
    }
};
</script>