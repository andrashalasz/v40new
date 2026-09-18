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

/** Forintos ár, ahogy a weboldalon: "145 000 Ft" */
export const formatFt = (n: number) => `${new Intl.NumberFormat('hu-HU').format(n)} Ft`

/** "2026. szeptember 21., hétfő, 10:00" */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Budapest',
  })
}

/** "10:00" – a foglalható idősávokhoz */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('hu-HU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Budapest',
  })
}
