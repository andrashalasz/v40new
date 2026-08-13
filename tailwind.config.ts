/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue",
    // Ha a Nuxt 4 struktúrát (app/ mappa) használod, ezeket is add hozzá:
    "./app/**/*.{js,vue,ts}",
    "./app.config.{ts,js}"
  ],
  plugins: [],
}