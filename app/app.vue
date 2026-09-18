<template>
        <div>
                <NuxtLayout>
                        <NuxtPage />
                </NuxtLayout>
        </div>
</template>

<script setup>
// A <html lang> kövesse a választott nyelvet (nem mindig 'hu'), különben a
// böngésző / képernyőolvasó rossz nyelvet feltételez.
const locale = useLocale()
useHead({
        htmlAttrs: { lang: locale },
        title: 'V40 Vital',
        link: [
                { rel: 'icon', type: 'image/x-icon', href: '/favicon.svg' },
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
                {
                        rel: 'stylesheet',
                        href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Manrope:wght@200..800&display=swap'
                }
        ],
        style: [
                {
                        children: `
        body {
          font-family: 'Manrope', sans-serif;
        }
        .manrope { font-family: 'Manrope', sans-serif; }
        .dm-sans { font-family: 'DM Sans', sans-serif; }
      `
                }
        ]
})
</script>

<style>
.dm-sans {
        font-family: 'DM Sans', sans-serif;
}

/* A felugró kategória-leírás (v-html) prémium, Word-szerű formázása. A stílus
   itt van, mert a v-html-be írt Tailwind-osztályokat a JIT nem generálná. */
.cat-body {
        color: #2a2622;
        font-size: 16.5px;
        line-height: 1.78;
        font-family: 'Manrope', sans-serif;
}

/* Bevezető (első bekezdés) kiemelve */
.cat-body > p:first-of-type {
        font-size: 18px;
        line-height: 1.7;
        color: #153131;
        font-weight: 500;
        background: linear-gradient(180deg, #F0FAFB 0%, #E9F6F8 100%);
        border-left: 4px solid #153131;
        padding: 16px 20px;
        border-radius: 0 12px 12px 0;
        margin: 0 0 24px;
}

/* Címsorok – márka-türkiz, akcentus-jelöléssel */
.cat-body h3 {
        font-family: 'DM Sans', sans-serif;
        font-weight: 700;
        color: #153131;
        font-size: 21px;
        line-height: 1.3;
        margin: 34px 0 14px;
        padding-left: 15px;
        position: relative;
}
.cat-body h3::before {
        content: "";
        position: absolute;
        left: 0; top: 4px; bottom: 4px;
        width: 5px;
        border-radius: 4px;
        background: linear-gradient(180deg, #153131 0%, #3d7f7f 100%);
}
.cat-body h3:first-child { margin-top: 4px; }

.cat-body p { margin: 0 0 14px; }
.cat-body strong { color: #153131; font-weight: 700; }
.cat-body em { color: #3d7f7f; }
.cat-body a { color: #1f6b6b; text-decoration: underline; text-underline-offset: 2px; }

/* Listák – egyedi türkiz jelölővel */
.cat-body ul { list-style: none; padding-left: 4px; margin: 6px 0 20px; }
.cat-body ul > li {
        position: relative;
        padding-left: 28px;
        margin: 8px 0;
}
.cat-body ul > li::before {
        content: "";
        position: absolute;
        left: 6px; top: 10px;
        width: 8px; height: 8px;
        border-radius: 50%;
        background: #153131;
        box-shadow: 0 0 0 4px #E5F7F9;
}
.cat-body ol { padding-left: 24px; margin: 6px 0 20px; }
.cat-body ol > li { margin: 8px 0; padding-left: 4px; }
.cat-body ol > li::marker { color: #153131; font-weight: 700; }

/* Táblázatok – prémium: türkiz fejléc, zebra, lekerekített keret */
.cat-table {
        overflow-x: auto;
        margin: 20px 0;
        border-radius: 16px;
        border: 1px solid #DDE7E7;
        box-shadow: 0 6px 24px -12px rgba(21, 49, 49, 0.25);
}
.cat-body table { width: 100%; border-collapse: collapse; font-size: 14.5px; background: #fff; }
.cat-body thead th, .cat-body tr:first-child td {
        background: #153131;
        color: #F4F4F0;
        font-weight: 600;
        font-family: 'DM Sans', sans-serif;
}
.cat-body th, .cat-body td {
        padding: 12px 16px;
        text-align: left;
        vertical-align: top;
        border-bottom: 1px solid #EAF1F1;
}
.cat-body tbody tr:nth-child(even), .cat-body table tr:nth-child(even) { background: #F7FBFB; }
.cat-body tbody tr:hover, .cat-body table tr:hover { background: #EEF7F7; }
.cat-body td p { margin: 0; }
.cat-body td strong { color: #153131; }
</style>