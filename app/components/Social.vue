<template>
    <div class="relative w-full pt-10 pb-20 lg:px-[100px] bg-[#F4F4F0]">
        <div class="w-full max-w-[1440px] mx-auto p-4 lg:px-0">
            <div class="px-3 lg:px-0 flex flex-col items-center max-w-[1440px] mx-auto mb-16">
                <h2 class="text-[28px] lg:text-[48px] dm-sans font-bold mb-4 text-center text-[#171008]">
                    Nézd meg online felületeinket!
                </h2>
                <p class="dm-sans text-[#171008] text-[18px] text-center lg:max-w-[540px]">
                    Kövess minket friss hírekért, edukatív tartalmakért és gyakorlati tanácsokért
                </p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <NuxtLink to="https://www.instagram.com/v40vital/" class="w-full">
                    <NuxtImg src="29.png" alt="doctor.name"
                        class="w-full lg:h-[550px] object-cover rounded-lg mb-2 shadow-md" />
                    <div class="flex items-center justify-center mt-8 gap-2">
                        <h3 class="text-[24px] font-medium dm-sans text-[#171008]">Instagram</h3>
                    </div>
                </NuxtLink>
                <NuxtLink to="https://www.tiktok.com/@v40vital?is_from_webapp=1&sender_device=pc" class="w-full">
                    <NuxtImg src="30.png"
                        alt="doctor.name" class="w-full lg:h-[550px] object-cover rounded-lg mb-2 shadow-md" />
                    <div class="flex items-center justify-center mt-8 gap-2">
                        <h3 class="text-[24px] font-medium dm-sans text-[#171008]">TikTok</h3>
                    </div>
                </NuxtLink>
                <NuxtLink to="https://www.facebook.com/people/V40Vital/61577439698033/?sk=directory_contact_info" class="w-full">
                    <NuxtImg src="31.png"
                        alt="doctor.name" class="w-full lg:h-[550px] object-cover rounded-lg mb-2 shadow-md" />
                    <div class="flex items-center justify-center mt-8 gap-2">
                        <h3 class="text-[24px] font-medium dm-sans text-[#171008]">Facebook</h3>
                    </div>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>