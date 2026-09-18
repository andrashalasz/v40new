/**
 * Szerkeszthető szövegek a frontenden. A `t('kulcs', 'alapértelmezés')` a kért
 * nyelven adja a szöveget; ha egy kulcs hiányzik (vagy a szerkesztés üres),
 * a kódbeli alapértelmezés jelenik meg – így egy hiba sem tud üres oldalt adni.
 *
 * A tartalmat nyelvenként egyszer töltjük be (useAsyncData dedup), majd minden
 * komponens ugyanazt a gyorsítótárat használja.
 */
export async function useContent() {
  const locale = useLocale()
  const { data } = await useAsyncData(
    () => `content-${locale.value}`,
    () => $fetch<Record<string, string>>('/api/content', { query: { locale: locale.value } }),
  )
  const t = (key: string, fallback = '') => {
    const v = data.value?.[key]
    return v && v.length ? v : fallback
  }
  return { t }
}
