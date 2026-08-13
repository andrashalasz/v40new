<template>
    <div class="min-h-screen bg-[#020617] text-slate-200 flex font-sans">
        <aside
            class="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col sticky top-0 h-screen">
            <div class="p-8">
                <div class="flex items-center gap-3 group cursor-pointer">
                    <div
                        class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <span class="text-white font-bold text-xl">V</span>
                    </div>
                    <h2
                        class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        V40</h2>
                </div>
            </div>

            <nav class="flex-1 px-6 space-y-1">
                <NuxtLink to="/admin"
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-medium text-sm">
                    Vezérlőpult</NuxtLink>
                <NuxtLink to="/admin/blogok"
                    class="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-400 hover:bg-white/5 transition-all text-sm">
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
                <div>
                    <h1 class="text-2xl font-bold text-white italic tracking-tight">Vezérlőpult</h1>
                    <p class="text-xs text-slate-500 uppercase tracking-tighter">Rendszerállapot és gyorsstatisztika</p>
                </div>
                <div class="flex items-center gap-3 pl-6">
                    <div class="text-right">
                        <p class="text-sm font-bold text-white">Adminisztrátor</p>
                        <button @click="logout()" class="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse">Kilepes</button>
                    </div>
                </div>
            </header>

            <div class="p-10 space-y-10">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Blog posztok" :value="blogs?.length || 0" trend="Összes bejegyzés" color="blue" />
                    <StatCard title="Termékek" :value="products?.length || 0" trend="Aktív kínálat" color="emerald" />
                    <StatCard title="Szakorvosok" :value="doctors?.length || 0" trend="Regisztrált orvos"
                        color="purple" />
                </div>

                <div
                    class="bg-slate-900/40 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-sm">
                    <div class="p-8 flex justify-between items-center bg-white/[0.02]">
                        <div>
                            <h3 class="text-xl font-bold text-white italic">Legutóbbi Blogok</h3>
                            <p class="text-sm text-slate-500">A legfrissebb bejegyzések az adatbázisból.</p>
                        </div>
                        <NuxtLink to="/admin/blogok/add"
                            class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-lg shadow-blue-600/20">
                            <span>+</span> Új Blog
                        </NuxtLink>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead>
                                <tr
                                    class="text-slate-500 text-[11px] uppercase tracking-widest border-b border-white/5">
                                    <th class="px-8 py-5 font-semibold">Cím</th>
                                    <th class="px-8 py-5 font-semibold">Slug</th>
                                    <th class="px-8 py-5 font-semibold text-right">Művelet</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                <tr v-for="blog in recentBlogs" :key="blog.id"
                                    class="group hover:bg-white/[0.02] transition-colors">
                                    <td class="px-8 py-6">
                                        <p class="text-white font-semibold group-hover:text-blue-400 transition-colors">
                                            {{ blog.title }}</p>
                                    </td>
                                    <td class="px-8 py-6 text-sm text-slate-500 font-mono italic">/{{ blog.slug }}</td>
                                    <td class="px-8 py-6 text-right">
                                        <NuxtLink :to="`/admin/blogok/edit/${blog.id}`"
                                            class="px-4 py-2 hover:bg-blue-600/10 text-blue-400 rounded-lg text-xs font-bold transition border border-white/5">
                                            Szerkesztés
                                        </NuxtLink>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div v-if="!blogs?.length" class="p-10 text-center text-slate-600 italic">
                            Nincs megjeleníthető adat.
                        </div>
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

const { clear: clearSession } = useUserSession();

async function logout() {
    await clearSession();
    await navigateTo('/');
}

// Adatok lekérése a három különböző API végpontról
const { data: blogs } = await useFetch('/api/blogs')
const { data: products } = await useFetch('/api/products')
const { data: doctors } = await useFetch('/api/doctors')

// Csak az utolsó 5 blog bejegyzés megjelenítése a főoldalon
const recentBlogs = computed(() => {
    return blogs.value ? [...blogs.value].reverse().slice(0, 5) : []
})

// Statisztikai kártya komponens
const StatCard = (props) => h('div', { class: 'bg-slate-900/40 p-7 rounded-[2rem] border border-white/5 hover:border-blue-500/30 transition-all group' }, [
    h('p', { class: 'text-slate-500 text-sm font-medium uppercase tracking-tighter' }, props.title),
    h('div', { class: 'flex items-end justify-between mt-3' }, [
        h('p', { class: 'text-5xl font-black text-white' }, props.value.toString()),
        h('span', { class: `text-[10px] font-bold px-3 py-1 rounded-lg bg-${props.color}-500/10 text-${props.color}-400 border border-${props.color}-500/20 uppercase` }, props.trend)
    ])
]);
</script>

<style>
/* Egy kis extra finomítás a görgetéshez */
::-webkit-scrollbar {
    width: 5px;
}

::-webkit-scrollbar-track {
    background: #020617;
}

::-webkit-scrollbar-thumb {
    background: #1e293b;
    border-radius: 10px;
}
</style>