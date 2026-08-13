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
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-white/5 transition-all text-sm italic">
                    Vezérlőpult</NuxtLink>
                <NuxtLink to="/admin/blogok"
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-white/5 transition-all text-sm">
                    Blogok</NuxtLink>
                <NuxtLink to="/admin/termekek"
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-white/5 transition-all text-sm">
                    Termékek</NuxtLink>
                <NuxtLink to="/admin/orvosok"
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-medium text-sm">
                    Orvosok</NuxtLink>
            </nav>
        </aside>

        <main class="flex-1">
            <header
                class="h-20 px-10 flex items-center justify-between border-b border-white/5 bg-slate-950/20 backdrop-blur-md sticky top-0 z-10">
                <h1 class="text-xl font-bold text-white uppercase tracking-widest">Orvoskezelő központ</h1>
                <div class="flex items-center gap-3 pr-4 border-r border-white/10 mr-4">
                    <span class="text-xs font-bold text-emerald-400 uppercase tracking-tighter">Adatbázis: Live</span>
                </div>
            </header>

            <div class="p-10 space-y-8">
                <div class="flex justify-between items-end">
                    <div>
                        <h2 class="text-4xl font-black text-white tracking-tight">Orvosaink</h2>
                        <p class="text-slate-500 mt-1 text-sm italic">Szakértői csapat és biográfiák kezelése.</p>
                    </div>
                    <NuxtLink to="/admin/orvosok/add"
                        class="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-bold transition-all shadow-xl shadow-blue-600/30 active:scale-95">
                        + Új orvos rögzítése
                    </NuxtLink>
                </div>

                <div
                    class="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-sm">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr
                                class="text-slate-500 text-[11px] uppercase tracking-[0.2em] border-b border-white/5 bg-white/[0.02]">
                                <th class="px-10 py-6 font-semibold tracking-widest">Név / Titulus</th>
                                <th class="px-10 py-6 font-semibold">Szakterület</th>
                                
                                <th class="px-10 py-6 font-semibold text-right">Kezelés</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            <tr v-for="doctor in doctors" :key="doctor.id"
                                class="group hover:bg-white/[0.03] transition-colors">
                                <td class="px-10 py-7 flex items-center gap-4">
                                    <img :src="doctor.picUrl || 'https://via.placeholder.com/50'"
                                        class="w-6 h-6 rounded-full object-cover border border-white/10" />
                                    <div>
                                        <p
                                            class="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
                                            {{ doctor.name }}</p>
                                        <p class="text-[10px] text-slate-500 font-mono italic">ID: #{{ doctor.id }}</p>
                                    </div>
                                </td>
                               
                                <td class="px-10 py-7">
                                    <span
                                        class=" text-white text-[14px] tracking-widest">
                                        {{ doctor.desc }}
                                    </span>
                                </td>
                                <td class="px-10 py-7 text-right">
                                    <div class="flex justify-end gap-3">
                                        <NuxtLink :to="`/admin/orvosok/edit/${doctor.id}`"
                                            class="px-4 py-2 bg-slate-800 hover:bg-blue-600/20 text-blue-400 rounded-xl transition text-xs font-bold border border-white/5">
                                            Szerkeszt</NuxtLink>
                                        <button @click="handleDelete(doctor.id)"
                                            class="px-4 py-2 bg-slate-800 hover:bg-red-600/20 text-red-400 rounded-xl transition text-xs font-bold border border-white/5">
                                            Töröl
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div v-if="doctors?.length === 0" class="p-20 text-center text-slate-600 font-italic">
                        Még nem rögzítettél orvost az adatbázisba.
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
// Orvosok lekérése
const { data: doctors, refresh } = await useFetch('/api/doctors')

const handleDelete = async (id) => {
    if (confirm('Biztosan törlöd ezt az orvost a listáról?')) {
        try {
            const res = await $fetch('/api/doctors', {
                method: 'DELETE',
                body: { id }
            })
            if (res.success) {
                refresh()
            } else {
                alert("Hiba: " + res.error)
            }
        } catch (err) {
            alert("Hiba történt a törlés során.")
        }
    }
}
</script>