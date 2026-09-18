import {
  isHealthDataAvailable,
  queryCategorySamples,
  queryStatisticsCollectionForQuantity,
  requestAuthorization,
  CategoryValueSleepAnalysis,
} from '@kingstinct/react-native-healthkit'
import { QUANTITY_METRICS, ALL_READ_IDENTIFIERS, SLEEP_IDENTIFIER } from './metrics'

/**
 * APPLE HEALTH BEOLVASÁS
 *
 * A napi összesítést a HEALTHKIT végzi, nem mi: a
 * `queryStatisticsCollectionForQuantity` natívan adja napi bontásban az
 * összeget / átlagot / szélsőértékeket. Ez nagyságrendekkel gyorsabb, mint a
 * nyers mintákat áthozni JavaScriptbe – egy év pulzusadat több százezer minta,
 * amit már beolvasni is másodpercekig tartana, nemhogy összesíteni.
 *
 * Amit felküldünk, az így eleve napi érték: a nyers minta soha nem hagyja el a
 * készüléket. Ez nem csak sebesség kérdése – kevesebb adat kezelése a GDPR
 * adattakarékossági elvének is megfelel.
 */

/** Egy nap egy méréshez – ugyanaz az alak, amit a szerver vár. */
export type DailySample = {
  metric: string
  day: string
  sum?: number
  avg?: number
  min?: number
  max?: number
  count?: number
}

export const isAvailable = () => isHealthDataAvailable()

/**
 * Olvasási engedély kérése a megadott kategóriákhoz.
 *
 * FONTOS, amit az Apple szándékosan így tervezett: a visszatérési érték NEM
 * azt mondja meg, hogy a felhasználó engedélyezte-e az olvasást. Csak azt,
 * hogy a kérdés megjelent-e. Olvasási jogosultságot lekérdezni nem lehet –
 * különben abból, hogy egy app „nem lát" adatot, következtetni lehetne arra,
 * hogy a felhasználónak van/nincs bizonyos adata (pl. terhesség).
 *
 * Ezért a tényleges eredményt onnan tudjuk, hogy JÖN-E adat a lekérdezésre.
 */
export async function requestPermissions(identifiers: readonly string[] = ALL_READ_IDENTIFIERS) {
  return requestAuthorization({
    // Csak OLVASUNK. Írási jogot nem kérünk: az app nem módosítja a
    // felhasználó egészségügyi adatait, és a felesleges jogosultság a
    // store-review-n is indokolást kívánna.
    toRead: identifiers as never,
  })
}

/** "2026-09-18" a készülék helyi ideje szerint. */
const dayKey = (d: Date) => d.toLocaleDateString('sv-SE')

/**
 * Mennyiségi mérések napi összesítése.
 *
 * Az `anchorDate` éjfélre van állítva: ez mondja meg a HealthKitnek, hol
 * kezdődjön a napi vágás. Ha ezt elrontanánk, a napok elcsúsznának, és a
 * „vasárnapi lépésszám" valójában szombat délutántól vasárnap délutánig
 * tartana – ami észrevétlenül rossz adatot adna.
 */
export async function readQuantityMetrics(from: Date, to: Date): Promise<DailySample[]> {
  const anchor = new Date(from)
  anchor.setHours(0, 0, 0, 0)

  const out: DailySample[] = []

  for (const metric of QUANTITY_METRICS) {
    const stats =
      metric.aggregation === 'sum'
        ? (['cumulativeSum'] as const)
        : metric.aggregation === 'average'
          ? (['discreteAverage', 'discreteMin', 'discreteMax'] as const)
          : (['mostRecent'] as const)

    try {
      const collection = await queryStatisticsCollectionForQuantity(
        metric.identifier,
        stats as never,
        anchor,
        { day: 1 },
        {
          unit: metric.unit as never,
          filter: { date: { startDate: from, endDate: to } },
        },
      )

      for (const row of collection) {
        if (!row.startDate) continue
        const day = dayKey(new Date(row.startDate))

        const sum = row.sumQuantity?.quantity
        const avg = row.averageQuantity?.quantity
        const min = row.minimumQuantity?.quantity
        const max = row.maximumQuantity?.quantity
        const recent = row.mostRecentQuantity?.quantity

        // A HealthKit az üres napokra is ad sort, csak érték nélkül. Azokat
        // kihagyjuk – különben a szerveren nullás napok jelennének meg, ami
        // mást jelent, mint a „nincs adat".
        const value =
          metric.aggregation === 'sum' ? sum : metric.aggregation === 'average' ? avg : recent
        if (value === undefined || value === null) continue

        out.push({
          metric: metric.key,
          day,
          ...(metric.aggregation === 'sum'
            ? { sum: value }
            : { avg: value, min: min ?? undefined, max: max ?? undefined }),
          count: 1,
        })
      }
    } catch {
      // Egy mérés hiánya (nincs rá engedély, vagy a készülék nem ismeri) nem
      // akaszthatja meg a többit. A felhasználó azt fogja látni, hogy arra a
      // mérésre nincs adat – ami igaz is.
      continue
    }
  }

  return out
}

/** Az alvásfázisok HealthKit-értékei, amelyek TÉNYLEGES alvást jelentenek. */
const ASLEEP_VALUES = new Set<number>([
  CategoryValueSleepAnalysis.asleepUnspecified,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
])

/**
 * Alvás: hossz, mélyalvás és REM, éjszakánként.
 *
 * Két dolgot kell jól csinálni, és mindkettő könnyen elromlik:
 *
 *  1. Az „inBed" (ágyban töltött idő) NEM alvás. Ha beleszámítanánk, egy
 *     olvasgatással töltött óra alvásidőnek látszana.
 *
 *  2. Az éjszaka ÁTNYÚLIK éjfélen. A 23:30-tól 07:00-ig tartó alvást ezért a
 *     REGGELHEZ rendeljük: az orvos „szeptember 18-i alvás" alatt a 17-ről
 *     18-ra virradó éjszakát érti. Naptári napra vágva minden éjszaka két
 *     félbevágott darabként jelenne meg.
 */
export async function readSleep(from: Date, to: Date): Promise<DailySample[]> {
  let samples: readonly { startDate: Date; endDate: Date; value: number }[] = []

  try {
    samples = (await queryCategorySamples(SLEEP_IDENTIFIER, {
      limit: 0,
      filter: { date: { startDate: from, endDate: to } },
    })) as never
  } catch {
    return []
  }

  // Éjszakánként (a reggel dátuma szerint) gyűjtjük az órákat.
  const byNight = new Map<string, { total: number; deep: number; rem: number }>()

  for (const s of samples) {
    if (!ASLEEP_VALUES.has(s.value)) continue

    const start = new Date(s.startDate)
    const end = new Date(s.endDate)
    const hours = (end.getTime() - start.getTime()) / 3_600_000
    if (!Number.isFinite(hours) || hours <= 0) continue

    // Az éjszakát a VÉGE (a reggel) azonosítja. A délelőtt 10 előtt véget érő
    // alvás az aznapi éjszaka; a későbbi (nappali alvás) marad a saját napján.
    const night = dayKey(end)

    const acc = byNight.get(night) ?? { total: 0, deep: 0, rem: 0 }
    acc.total += hours
    if (s.value === CategoryValueSleepAnalysis.asleepDeep) acc.deep += hours
    if (s.value === CategoryValueSleepAnalysis.asleepREM) acc.rem += hours
    byNight.set(night, acc)
  }

  const out: DailySample[] = []
  const round = (n: number) => Math.round(n * 100) / 100

  for (const [day, v] of byNight) {
    if (v.total > 0) out.push({ metric: 'sleepDuration', day, sum: round(v.total), count: 1 })
    if (v.deep > 0) out.push({ metric: 'sleepDeep', day, sum: round(v.deep), count: 1 })
    if (v.rem > 0) out.push({ metric: 'sleepRem', day, sum: round(v.rem), count: 1 })
  }

  return out
}
