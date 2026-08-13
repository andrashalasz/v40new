<template>
    <Gradient />
    <Header />
     <div class="relative w-full pb-12 pt-12 lg:pt-14 lg:pb-14 lg:px-[100px] bg-[#E5F7F9]">
        <div class="relative w-full">
            <div class="w-full max-w-[1440px] mx-auto flex flex-col p-4 lg:px-0">
                <p class="dm-sans text-[#171008] font-semibold text-[14px]">BLOG</p>
                <h1 class="text-[32px] lg:text-[64px] dm-sans font-bold mb-4 text-[#171008]">
                    {{ blog.title }}
                </h1>
            </div>
            
       </div>
       </div>

    <div class="relative w-full pb-4 pt-4 lg:pt-4 lg:pb-4 lg:px-[100px] bg-[#F4F4F0]">

       <div class="w-full max-w-[1440px] mx-auto flex flex-col-reverse lg:flex-row lg:gap-10 p-4 lg:px-0">
        <div class="w-full lg:w-[60%] preview-content text-[16px] text-[#00000080] dm-sans" v-html="blog.rows">
           
        </div>
        
            <NuxtImg :src="blog.picUrl" class="w-full lg:w-[40%] lg:h-[40%] rounded-xl" />
       
    </div>
    </div>
    <BlueBlogs />
    <MBanner />
    <Footer />
</template>

<script setup>
const route = useRoute();

const { data: blogData, error } = await useAsyncData('blog', () =>
    $fetch(`/api/blogs?slug=${route.params.slug}`)
);

if (error.value) {
    throw createError({ statusCode: 404, statusMessage: error.value.statusMessage });
}

const blog = computed(() => blogData.value|| null);

</script>

<style>
.preview-content p:empty::before {
    content: " ";
    display: block;
    height: 1em;

}

/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
    display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
    -ms-overflow-style: none;
    /* IE and Edge */
    scrollbar-width: none;
    /* Firefox */
}

.shadow-box {
    box-shadow: 0px 2px 16px 0px #12121214;
}

.tiptap {
    :first-child {
        margin-top: 0;
    }

    /* List styles */
    ul,
    ol {
        padding: 0 1rem;
        margin: 1.25rem 1rem 1.25rem 0.4rem;

        li p {
            margin-top: 0.25em;
            margin-bottom: 0.25em;
        }
    }

    /* Heading styles */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        line-height: 1.1;
        margin-top: 2.5rem;
        text-wrap: pretty;
    }

    h1,
    h2 {
        margin-top: 3.5rem;
        margin-bottom: 1.5rem;
    }

    h1 {
        font-size: 1.4rem;
    }

    h2 {
        font-size: 1.2rem;
    }

    h3 {
        font-size: 1.1rem;
    }

    h4,
    h5,
    h6 {
        font-size: 1rem;
    }

    /* Code and preformatted text styles */
    code {
        background-color: var(--purple-light);
        border-radius: 0.4rem;
        color: var(--black);
        font-size: 0.85rem;
        padding: 0.25em 0.3em;
    }

    pre {
        background: var(--black);
        border-radius: 0.5rem;
        color: var(--white);
        font-family: 'JetBrainsMono', monospace;
        margin: 1.5rem 0;
        padding: 0.75rem 1rem;

        code {
            background: none;
            color: inherit;
            font-size: 0.8rem;
            padding: 0;
        }
    }

    a {
        color: #007bff;
        /* világoskék, de te adhatsz más hex kódot is */
    }

    blockquote {
        border-left: 3px solid var(--gray-3);
        margin: 1.5rem 0;
        padding-left: 1rem;
    }

    hr {
        border: none;
        border-top: 1px solid var(--gray-2);
        margin: 2rem 0;
    }
}
</style>