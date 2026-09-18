/**
 * Az arculat színei és méretei – a weboldalról átvéve, hogy az app és a
 * honlap egy rendszernek látsszon, ne két külön terméknek.
 */
export const colors = {
  /** Sötétzöld: gombok, kiemelt felületek */
  ink: '#153131',
  /** Szöveg */
  text: '#171008',
  textMuted: 'rgba(0, 0, 0, 0.5)',
  /** Halvány kék: fejlécek, kiemelt sávok */
  tint: '#E5F7F9',
  /** Krém: az oldal háttere */
  bg: '#F4F4F0',
  surface: '#FFFFFF',
  border: 'rgba(0, 0, 0, 0.1)',
  /** Címke-háttér */
  chip: 'rgba(47, 115, 242, 0.1)',
  danger: '#B3261E',
  success: '#1B5E20',
  onInk: '#F4F4F0',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const

/**
 * Formázók.
 *
 * Mindegyik kap nyelvet, mert a szám- és dátumalak nyelvenként más: a magyar
 * "2026. szeptember 21.", a német "21. September 2026", az angol
 * "21 September 2026".
 *
 * Az IDŐZÓNA viszont MINDIG Europe/Budapest, függetlenül a telefon nyelvétől
 * és helyétől. A rendelő Budapesten van: egy Bécsben nyaraló magyar vendégnek
 * is a budapesti 10:00-t kell látnia, nem a saját készüléke szerinti időt.
 *
 * A pénznem is marad forint – a kezelés forintban van árazva.
 */

const TZ = 'Europe/Budapest'

/** "145 000 Ft" */
export const formatPrice = (n: number, locale: string) =>
  `${new Intl.NumberFormat(locale).format(n)} Ft`

/** Teljes időpont, a nap nevével. */
export const formatDateTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })

/** Csak dátum: "2026. 09. 21." */
export const formatDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { timeZone: TZ })

/** "10:00" – a foglalható idősávokhoz. */
export const formatTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })

/** A naptár napjaihoz: rövid napnév és hónap. */
export const formatWeekday = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { weekday: 'short', timeZone: TZ })

export const formatMonth = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { month: 'short', timeZone: TZ })

/**
 * Egy időpont NAPJA a rendelő időzónájában, "2026-09-21" alakban.
 *
 * Miért nem `toISOString().slice(0,10)`: az UTC szerint vágna. Egy este 23:00-s
 * budapesti időpont UTC-ben már a KÖVETKEZŐ nap 21:00 – a naptárban rossz nap
 * alá kerülne.
 */
export const clinicDayOf = (iso: string) =>
  new Date(iso).toLocaleDateString('sv-SE', { timeZone: TZ })
