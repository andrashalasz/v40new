<template>
    <div>
        <div class="mb-5 flex items-center gap-3">
            <NuxtLink to="/admin/blogok" class="text-[#667085] hover:text-[#101828] transition-colors">
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </NuxtLink>
            <h1 class="font-bold text-[24px] tracking-tight">Új bejegyzés</h1>
        </div>
        <div class="max-w-3xl rounded-xl border border-[#ECEDEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-6">
            <form class="flex flex-col gap-5" @submit.prevent="uploadBlog">
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
                    <label class="block text-[13px] font-semibold text-[#344054] mb-1.5">Kép a kártyához</label>
                    <input type="file" @change="handleFileChange($event)" accept="image/*" required class="text-sm" />
                    <div v-if="cardPreview" class="mt-3">
                        <img :src="cardPreview" class="w-full max-h-64 object-cover rounded-lg border border-[#ECEDEF]" />
                    </div>
                </div>
                <div class="flex justify-end gap-2 border-t border-[#ECEDEF] pt-4">
                    <NuxtLink to="/admin/blogok" class="rounded-lg border border-[#D9DCE1] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors">Mégsem</NuxtLink>
                    <button type="submit" class="rounded-lg bg-[#153131] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2525] transition-colors">
                        Feltöltés
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
definePageMeta({ layout: "admin", middleware: ["admin"] })

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