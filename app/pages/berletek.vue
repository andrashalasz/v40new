<script setup lang="ts">
interface Pass {
  id: number
  slug: string
  title: string
  desc: string
  priceGross: number
  vatRate: number
  sessionCount: number | null
  validityDays: number
  transferable: boolean
  listPriceGross: number
  savingGross: number
  services: { title: string; slug: string }[]
}

const { data: passes } = await useFetch<Pass[]>('/api/passes')
const Ft = (n: number) => new Intl.NumberFormat('hu-HU').format(n) + ' Ft'

useSeoMeta({
  title: 'Bérletek | V40 Vital',
  description:
    'Több alkalomra előre, kedvezőbb áron. Bérleteink érvényessége és felhasználási feltételei.',
})
</script>

<template>
  <Header />

  <div class="relative w-full pb-10 pt-12 lg:pt-16 lg:pb-14 lg:px-[100px] bg-[#E5F7F9]">
    <div class="w-full max-w-[1440px] mx-auto flex flex-col items-center p-4 lg:px-0">
      <h1 class="text-[32px] lg:text-[56px] dm-sans font-bold mb-3 text-center text-[#171008]">Bérletek</h1>
      <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">
        Több alkalomra előre – kedvezőbb áron, kötött érvényességgel.
      </p>
    </div>
  </div>

  <div class="w-full bg-[#F4F4F0] py-10 lg:py-14 lg:px-[100px]">
    <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
      <div v-for="p in passes" :key="p.id" class="bg-white rounded-lg p-6 lg:p-8 mb-4">
        <div class="flex flex-col lg:flex-row lg:justify-between gap-5">
          <div>
            <h2 class="dm-sans font-bold text-[22px] mb-2">{{ p.title }}</h2>
            <p class="dm-sans text-[#00000080] text-[15px] mb-3">{{ p.desc }}</p>
            <p class="dm-sans text-[15px] mb-3">
              Felhasználható:
              <span v-for="(s, i) in p.services" :key="s.slug">
                <NuxtLink :to="`/szolgaltatas/${s.slug}`" class="underline">{{ s.title }}</NuxtLink>{{ i < p.services.length - 1 ? ', ' : '' }}
              </span>
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="bg-[#2F73F21A] text-[#153131] rounded-sm px-2 py-1 text-[14px]">
                {{ p.sessionCount ? `${p.sessionCount} alkalom` : 'korlátlan alkalom' }}
              </span>
              <span class="bg-[#2F73F21A] text-[#153131] rounded-sm px-2 py-1 text-[14px]">
                {{ p.validityDays }} nap érvényesség
              </span>
              <span v-if="p.savingGross > 0" class="bg-[#EFF7F2] text-[#1F6B4A] rounded-sm px-2 py-1 text-[14px] font-bold">
                {{ Ft(p.savingGross) }} megtakarítás
              </span>
            </div>
          </div>

          <div class="lg:text-right shrink-0">
            <p class="dm-sans font-bold text-[28px]">{{ Ft(p.priceGross) }}</p>
            <p v-if="p.savingGross > 0" class="text-[#00000080] text-[14px] line-through">
              {{ Ft(p.listPriceGross) }}
            </p>
            <p class="text-[#00000080] text-[13px] mt-1">
              {{ p.vatRate ? 'bruttó, 27% áfa' : 'áfamentes egészségügyi szolgáltatás' }}
            </p>
            <!--
              A vásárlás bankkártyás fizetést igényel, ami még nincs élesítve.
              Amíg nincs, nem teszünk ide gombot, ami hibára futna – helyette a
              kapcsolatfelvételre irányítunk.
            -->
            <NuxtLink
              to="/kapcsolat"
              class="inline-block mt-4 border-2 border-[#153131] text-[#153131] rounded-lg px-8 py-[14px] font-medium dm-sans"
            >
              Érdeklődöm
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="bg-[#E5F7F9] text-[#153131] rounded-lg p-5 max-w-[760px] text-[14px]">
        A bérlet a vásárlástól számított érvényességi időn belül használható fel.
        A fel nem használt alkalmakról és az elállási jogról az ÁSZF rendelkezik.
        Online vásárlás a bankkártyás fizetés élesítése után lesz elérhető – addig
        a bérlet a rendelőben vásárolható meg.
      </div>
    </div>
  </div>

  <WFooter />
</template>
