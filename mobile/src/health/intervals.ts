/**
 * ÁTFEDŐ IDŐSZAKOK ÖSSZEVONÁSA
 *
 * Miért kell: az Apple Healthbe TÖBB forrás is írhat ugyanarról az éjszakáról.
 * Egy Whoop, egy Apple Watch, egy Oura és maga az iPhone alvásészlelése
 * egymástól függetlenül rögzíti ugyanazt az alvást. Ha a szakaszok hosszát
 * egyszerűen összeadnánk, két forrásnál 14 óra alvás jönne ki egy 7 órás
 * éjszakára – és ez a hiba NEM látszik hibaüzenetként, csak egy hihetetlen
 * számként az orvos képernyőjén.
 *
 * A megoldás: a szakaszokat egyesítjük, és a LEFEDETT időt mérjük, nem a
 * szakaszok összegét. Két forrás ugyanarra az éjszakára így is 7 órát ad.
 *
 * Ugyanez a helyzet egyetlen forrásnál is: az órák sokszor percenkénti
 * szakaszokban rögzítenek, amelyek a határon átfedhetnek.
 */

export type Interval = { start: number; end: number }

/**
 * Átfedő és egymáshoz érő szakaszok összevonása.
 *
 * A bemenet tetszőleges sorrendű lehet. A kimenet rendezett, nem átfedő.
 */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const valid = intervals
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start)
    .sort((a, b) => a.start - b.start)

  const merged: Interval[] = []

  for (const current of valid) {
    const last = merged[merged.length - 1]

    // Az `end >= start` (és nem `>`) miatt a pontosan egymáshoz érő szakaszok
    // is összeolvadnak. Egy 23:00–00:00 és egy 00:00–01:00 szakasz két óra
    // összefüggő alvás, nem két külön epizód.
    if (last && current.start <= last.end) {
      if (current.end > last.end) last.end = current.end
    } else {
      merged.push({ start: current.start, end: current.end })
    }
  }

  return merged
}

/** Az összevont szakaszok által lefedett idő órában. */
export function coveredHours(intervals: readonly Interval[]): number {
  return mergeIntervals(intervals).reduce((sum, i) => sum + (i.end - i.start), 0) / 3_600_000
}
