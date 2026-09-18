/**
 * KEZELÉS ELŐTTI / UTÁNI ÖSSZEHASONLÍTÁS
 *
 * Az orvos kiválaszt egy kezelést, és látja, hogyan alakultak a mutatók a
 * kezelés előtti és utáni azonos hosszú időszakban.
 *
 * FONTOS HATÁR: ez LEÍRÁS, nem értelmezés. Számokat és eltérést mutatunk,
 * nem mondjuk meg, hogy a változás a kezelés MIATT történt, és nem javaslunk
 * belőle terápiát. Az ok-okozat megítélése az orvos dolga – ha a rendszer
 * mondaná ki, orvostechnikai eszközzé válna (EU MDR, Rule 11), ami engedélyezési
 * kötelezettséget vonna maga után.
 *
 * Ezért nincs „javult / romlott" minősítés sem: az irány önmagában nem
 * értékelés. Egy csökkenő nyugalmi pulzus általában kedvező, egy csökkenő
 * izomtömeg nem – a kettőt nem a szoftver dönti el.
 */

export type DailyPoint = { day: string; value: number }

export type WindowStats = {
  /** Az ablak első és utolsó napja (a tényleges adat szerint). */
  from: string | null
  to: string | null
  average: number | null
  min: number | null
  max: number | null
  /** Hány napra van adat – ebből látszik, mennyire megalapozott az átlag. */
  dayCount: number
}

export type Comparison = {
  before: WindowStats
  after: WindowStats
  /** Abszolút eltérés az átlagokban (utáni − előtti), vagy null. */
  delta: number | null
  /** Relatív eltérés százalékban, vagy null. */
  deltaPercent: number | null
  /**
   * Megbízható-e az összevetés. Akkor nem, ha valamelyik ablakban túl kevés
   * nap van adat: két nap alapján nem érdemes trendet mondani.
   */
  reliable: boolean
}

/** Minimum ennyi napnyi adat kell egy ablakban, hogy az átlagot mutassuk. */
export const MIN_DAYS_FOR_COMPARE = 3

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

function statsOf(points: DailyPoint[]): WindowStats {
  if (!points.length) {
    return { from: null, to: null, average: null, min: null, max: null, dayCount: 0 }
  }
  const values = points.map((p) => p.value)
  const days = points.map((p) => p.day).sort()
  return {
    from: days[0] ?? null,
    to: days[days.length - 1] ?? null,
    average: mean(values),
    min: Math.min(...values),
    max: Math.max(...values),
    dayCount: points.length,
  }
}

/** "2026-09-18" alakú nap a megadott eltolással. */
export function dayString(base: Date, offsetDays = 0): string {
  const d = new Date(base.getTime() + offsetDays * 86400_000)
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Budapest' })
}

/**
 * Két azonos hosszú ablak összevetése egy dátum körül.
 *
 * A kezelés NAPJA egyik ablakba sem kerül bele: aznap a kezelés maga is
 * torzít (utazás, várakozás, maga a beavatkozás), és nem egyértelmű, hogy
 * „előtte" vagy „utána" állapotot mutat.
 */
export function compareAround(
  points: DailyPoint[],
  pivotDay: string,
  windowDays: number,
): Comparison {
  const pivot = new Date(`${pivotDay}T00:00:00Z`)

  const beforeFrom = dayString(pivot, -windowDays)
  const afterTo = dayString(pivot, windowDays)

  const before = points.filter((p) => p.day >= beforeFrom && p.day < pivotDay)
  const after = points.filter((p) => p.day > pivotDay && p.day <= afterTo)

  const b = statsOf(before)
  const a = statsOf(after)

  const delta = b.average !== null && a.average !== null ? a.average - b.average : null
  const deltaPercent =
    delta !== null && b.average !== null && b.average !== 0
      ? (delta / Math.abs(b.average)) * 100
      : null

  return {
    before: b,
    after: a,
    delta,
    deltaPercent,
    reliable: b.dayCount >= MIN_DAYS_FOR_COMPARE && a.dayCount >= MIN_DAYS_FOR_COMPARE,
  }
}
