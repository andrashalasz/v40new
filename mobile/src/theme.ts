import { Platform, type TextStyle } from 'react-native'

/**
 * ARCULAT
 *
 * A színek és a betűk a weboldaléval azonosak (DM Sans a címeknek, Manrope a
 * szövegnek). Egy prémium szolgáltatás appja attól néz ki drágának, hogy
 * KEVESEBB dolog van benne, de azok pontosan: egy betűcsalád-pár, egy
 * kiemelőszín, nagy levegő, lágy mélység – éles keretek és sokféle szürke
 * helyett.
 */

export const colors = {
  /** Sötétzöld: gombok, címek, kiemelt felületek */
  ink: '#153131',
  /** Világosabb zöld a másodlagos hangsúlyokhoz */
  inkSoft: '#2A4F4F',
  /** Szöveg */
  text: '#171008',
  textMuted: '#6B6F6E',
  /** Halvány kék: fejlécek, kiemelt sávok */
  tint: '#E5F7F9',
  /** Krém: az oldal háttere */
  bg: '#F6F5F1',
  surface: '#FFFFFF',
  /** Alig látható elválasztó – a hangsúlyos keret olcsóvá teszi a felületet */
  line: 'rgba(21, 49, 49, 0.08)',
  /** Címke-háttér */
  chip: 'rgba(21, 49, 49, 0.06)',
  danger: '#B3261E',
  success: '#1B5E20',
  onInk: '#F6F5F1',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const

/**
 * Betűcsaládok.
 *
 * A neveket az expo-font tölti be (lásd app/_layout.tsx). Amíg a betűk
 * betöltődnek, a rendszerbetű látszik – ezért a felület csak a betöltés UTÁN
 * jelenik meg, különben egy zavaró ugrás lenne.
 */
export const fonts = {
  display: 'DMSans_700Bold',
  displayMedium: 'DMSans_500Medium',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
} as const

/**
 * Tipográfiai skála.
 *
 * Kevés, határozott lépcső. A sok, egymáshoz közeli méret az, amitől egy
 * felület rendezetlennek – és ezáltal olcsónak – hat.
 */
export const type = {
  display: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: colors.text,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: colors.text,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.text,
  },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.text },
  bodyMuted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.textMuted },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.text },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  price: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: colors.text,
  },
  button: { fontFamily: fonts.bodySemi, fontSize: 15, letterSpacing: 0.1 },
} satisfies Record<string, TextStyle>

/**
 * Lágy mélység keret helyett.
 *
 * Az éles, sötét keret a legjellemzőbb jel, amiről egy app „házilag
 * összeraktnak" hat. Egy alig érzékelhető árnyék ugyanazt a tagolást adja,
 * csak nyugodtabban.
 */
export const elevation = {
  card: Platform.select({
    ios: {
      shadowColor: colors.ink,
      shadowOpacity: 0.07,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 2 },
    default: {},
  }),
  raised: Platform.select({
    ios: {
      shadowColor: colors.ink,
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 5 },
    default: {},
  }),
} as const

// --- Formázók ---------------------------------------------------------------

/**
 * Mindegyik kap nyelvet, mert a szám- és dátumalak nyelvenként más.
 *
 * Az IDŐZÓNA viszont MINDIG Europe/Budapest, függetlenül a telefon nyelvétől
 * és helyétől: a rendelő Budapesten van, egy Bécsben nyaraló vendégnek is a
 * budapesti 10:00-t kell látnia.
 */
const TZ = 'Europe/Budapest'

/** "145 000 Ft" – keskeny szóközzel, hogy ne törjön sorvégen */
export const formatPrice = (n: number, locale: string) =>
  `${new Intl.NumberFormat(locale).format(n)} Ft`

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

export const formatDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { timeZone: TZ })

export const formatTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: TZ })

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
