<template>
    <Header />
    <div class="relative w-full pb-12 pt-12 lg:pt-16 lg:pb-16 lg:px-[100px] bg-[#E5F7F9]">
        <div class="relative w-full">
            <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
                <h1 class="text-[32px] lg:text-[64px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    GYIK
                </h1>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">Gyors válaszok a leggyakoribb
                    kérdésekre, egy helyen.
                </p>
            </div>
        </div>
    </div>
    <div class="relative w-full pb-6 lg:px-[100px] bg-[#F4F4F0]">
        <div class="relative w-full">
            <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">

                <div class="w-full py-10 flex justify-center flex-col items-center">
                    <div v-for="(item, index) in questions" :key="index" @click="toggleAnswer(index)"
                        class="w-full lg:max-w-[768px] mb-4 bg-[#E5F7F9] shadow-sm p-4 lg:p-8 rounded-[18px] cursor-pointer z-10">
                        <div :class="{ 'border-none': openedQuestions.includes(index) }"
                            class="text-left w-full mb-1 font-bold text-[#171008 text-[16px] lg:text-[24px] dm-sans flex items-center gap-1 justify-between">
                            <div class="flex items-center gap-2">
                                <p>{{ item.question }}</p>
                            </div>
                            <span :class="{
                                'transform rotate-180': !openedQuestions.includes(index),
                                'transform rotate-0': openedQuestions.includes(index)
                            }" class="transition-transform duration-300 flex-shrink-0">
                                <nuxt-img src="28.svg" alt="icon"
                                    class="h-6" />
                            </span>
                        </div>
                        <div v-show="openedQuestions.includes(index)" class="w-full mt-2 rounded-lg">
                            <p class="text-[#171008] text-[18px] dm-sans leading-[1.5] roboto">{{ item.answer }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <MBanner />
    <Footer />
</template>

<script setup>
useSeoMeta({
    title: 'GYIK | V40',
})

const questions = [
    {
        question: "Hogyan tudok időpontot foglalni?",
        answer: "Időpontot online, a Swazy rendszerén keresztül tudsz foglalni néhány kattintással a weboldalunkon. A foglalásról minden esetben visszaigazolást kapsz e-mailben, amely tartalmazza a vizsgálat pontos részleteit."
    },
    {
        question: "Kell-e előzetes leletet vagy laboreredményt hoznom?",
        answer: "Ez a választott kezeléstől függ, de ha van korábbi leleted vagy vizsgálati eredményed, mindenképpen érdemes magaddal hoznod. Ez segít szakembereinknek abban, hogy pontosabb és átfogóbb képet kapjanak az aktuális állapotodról."
    },
    {
        question: "Lehet-e online konzultációt kérni?",
        answer: "Igen, online konzultációra is van lehetőség. Időpont egyeztetéshez kérjük, vedd fel velünk a kapcsolatot a +36 30 934 3629-es telefonszámon, ahol a szakmai vezető segít a továbbiakban."
    },
    {
        question: "Mi történik, ha nem nekem való az adott kezelés vagy program?",
        answer: "A különböző programok és kezelések esetében előzetes egyeztetés szükséges. Ennek során segítünk eldönteni, hogy melyik irány a legmegfelelőbb számodra."
    },
    {
        question: "Milyen fizetési lehetőségek vannak? Van lehetőség egészségpénztári elszámolásra?",
        answer: "Online foglalás esetén bankkártyás fizetésre van lehetőség, a rendelőben pedig készpénzzel és bankkártyával is fizethetsz. Az egészségpénztári elszámolás lehetőségéről érdemes előre érdeklődni elérhetőségeinken, mivel ez szolgáltatásonként eltérhet."
    },
    {
        question: "Mi a lemondási vagy módosítási feltétel?",
        answer: "Az időpont a vizsgálat előtt legalább 24 órával lemondható vagy módosítható. 24 órán belüli lemondás esetén a szolgáltatás díjának 50% -a kerül felszámításra."
    },
    {
        question: "Van parkolási lehetőség a közelben?",
        answer: "A rendelő közvetlen környékén fizetős utcai parkolás érhető el. Mivel a belvárosi övezetben a szabad helyek száma változó, érdemes 10-15 perccel korábban érkezni, hogy kényelmesen találj parkolóhelyet."
    }
];

const openedQuestions = ref([]); // Több nyitott kérdés indexeit tároljuk

const toggleAnswer = (index) => {
    if (openedQuestions.value.includes(index)) {
        openedQuestions.value = openedQuestions.value.filter(i => i !== index);
    } else {
        openedQuestions.value.push(index);
    }
};
</script>
