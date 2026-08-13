<template>
    <div class="min-h-screen bg-[#020617] text-slate-200 flex font-sans">

        <aside
            class="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col sticky top-0 h-screen">
            <div class="p-8">
                <div class="flex items-center gap-3 group">
                    <div
                        class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span class="text-white font-bold text-xl">V</span>
                    </div>
                    <h2
                        class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        V40 Admin</h2>
                </div>
            </div>
            <nav class="flex-1 px-6 space-y-1">
                <NuxtLink to="/admin"
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-white/5 transition-all italic text-sm">
                    Vezérlőpult</NuxtLink>
                <NuxtLink to="/admin/blogok"
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-medium text-sm">
                    Blogok</NuxtLink>
                <NuxtLink to="/admin/termekek"
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-white/5 transition-all text-sm">
                    Termékek</NuxtLink>
                <NuxtLink to="/admin/orvosok"
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-white/5 transition-all text-sm">
                    Orvosok</NuxtLink>
            </nav>
        </aside>

        <main class="flex-1">
            <header
                class="h-20 px-10 flex items-center justify-between border-b border-white/5 bg-slate-950/20 backdrop-blur-md sticky top-0 z-10">
                <h1 class="text-xl font-bold text-white uppercase tracking-widest">Blogkezelő központ</h1>
                <div class="flex items-center gap-3 pr-4 border-r border-white/10 mr-4">
                    <span class="text-xs font-bold text-emerald-400 uppercase tracking-tighter">Adatbázis: Live</span>
                </div>
            </header>

            <div class="p-10 space-y-8">
                <div class="flex justify-between items-end">
                    <div>
                        <h2 class="text-4xl font-black text-white tracking-tight">Blogok</h2>
                        <p class="text-slate-500 mt-1 text-sm italic">Hírek, cikkek és longevity tippek szerkesztése.
                        </p>
                    </div>
                    <Nuxt-Link to="/admin/blogok/add"
                        class="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-bold transition-all shadow-xl shadow-blue-600/30 active:scale-95">
                        + Új bejegyzés
                    </Nuxt-Link>
                </div>

                <div
                    class="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-sm">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr
                                class="text-slate-500 text-[11px] uppercase tracking-[0.2em] border-b border-white/5 bg-white/[0.02]">
                                <th class="px-10 py-6 font-semibold tracking-widest">Bejegyzés címe</th>
                                <th class="px-10 py-6 font-semibold">Slug (URL)</th>
                                <th class="px-10 py-6 font-semibold text-right">Kezelés</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            <tr v-for="blog in blogs" :key="blog.id"
                                class="group hover:bg-white/[0.03] transition-colors">
                                <td class="px-10 py-7">
                                    <p class="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                                        {{ blog.title }}</p>
                                </td>
                                <td class="px-10 py-7 text-sm text-slate-500 font-mono tracking-tighter">/{{ blog.slug
                                    }}</td>
                                <td class="px-10 py-7 text-right">
                                    <div class="flex justify-end gap-3">
                                        <Nuxt-Link @click="openEditModal(blog)" :to="`/admin/blogok/edit/${blog.id}`"
                                            class="px-4 py-2 bg-slate-800 hover:bg-blue-600/20 text-blue-400 rounded-xl transition text-xs font-bold border border-white/5">Szerkeszt</Nuxt-Link>
                                        <button @click="handleDelete(blog.id)"
                                            class="px-4 py-2 bg-slate-800 hover:bg-red-600/20 text-red-400 rounded-xl transition text-xs font-bold border border-white/5">Töröl</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-if="blogs?.length === 0" class="p-20 text-center text-slate-600">
                        Nincs még feltöltött blogbejegyzés.
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup>
definePageMeta({
    middleware: ["admin"],
    layout: false,
});
// ADATOK LEKÉRÉSE
const { data: blogs, refresh } = await useFetch('/api/blogs')

// MODAL ÁLLAPOT ÉS FORM
const showModal = ref(false)
const editingId = ref(null)
const form = ref({ title: '', lead: '' })

// FUNKCIÓK
const openCreateModal = () => {
    editingId.value = null
    form.value = { title: '', lead: '' }
    showModal.value = true
}

const openEditModal = (blog) => {
    editingId.value = blog.id
    form.value = { ...blog }
    showModal.value = true
}

const handleSubmit = async () => {
    const method = editingId.value ? 'PUT' : 'POST'

    await $fetch('/api/blogs', {
        method,
        body: { ...form.value, id: editingId.value }
    })

    showModal.value = false
    refresh() // Táblázat frissítése
}

const handleDelete = async (id) => {
    if (confirm('Végleg törlöd ezt a cikket?')) {
        await $fetch('/api/blogs', {
            method: 'DELETE',
            body: { id }
        })
        refresh()
    }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>