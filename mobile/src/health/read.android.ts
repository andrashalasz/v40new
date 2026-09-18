import {
  aggregateGroupByPeriod,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  SleepStageType,
} from 'react-native-health-connect'
import { coveredHours, type Interval } from './intervals'
import type { DailySample } from './read'

/**
 * ANDROID – HEALTH CONNECT
 *
 * A Health Connect az Android egységes egészségügyi adattára: a Samsung
 * Health, a Google Fit, a Whoop, az Oura és a Garmin is ide ír. Ezért nincs
 * külön Samsung-integráció – a Samsung Health adatai innen jönnek.
 *
 * FONTOS KÜLÖNBSÉG AZ iOS-HEZ KÉPEST:
 *
 * Az Apple HealthKit gyakorlatilag bármelyik mérést tudja napi bontásban
 * összesíteni. A Health Connect NEM: csak egy szűkebb körhöz ad natív
 * összesítést (lépés, távolság, pulzus, alvás hossza, testsúly, vérnyomás...).
 *
 * Amihez nincs – HRV, VO2max, testzsír, izomtömeg –, azt NYERS rekordként
 * olvassuk, és itt összesítjük. Ez nem pazarlás: ezekből naponta legfeljebb
 * néhány mérés van, nem százezer, mint a pulzusból.
 */

/** A napi ablak a készülék helyi ideje szerint. */
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('sv-SE')

/** Health Connect engedélyek – csak OLVASÁS, írást nem kérünk. */
const READ_PERMISSIONS = [
  'Steps',
  'Distance',
  'ActiveCaloriesBurned',
  'ExerciseSession',
  'FloorsClimbed',
  'HeartRate',
  'RestingHeartRate',
  'HeartRateVariabilityRmssd',
  'BloodPressure',
  'Vo2Max',
  'SleepSession',
  'Weight',
  'BodyFat',
  'LeanBodyMass',
].map((recordType) => ({ accessType: 'read' as const, recordType }))

/**
 * Elérhető-e a Health Connect ezen a készüléken.
 *
 * Android 14 óta a rendszer része; korábbi verziókon a Play Áruházból
 * telepítendő. A hívó ebből tudja, kell-e a felhasználót odairányítani.
 */
export async function androidHealthStatus(): Promise<
  'ready' | 'needs-update' | 'unavailable'
> {
  try {
    const status = await getSdkStatus()
    if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'ready'
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return 'needs-update'
    }
    return 'unavailable'
  } catch {
    return 'unavailable'
  }
}

export async function requestAndroidPermissions(): Promise<boolean> {
  const ok = await initialize()
  if (!ok) return false
  const granted = await requestPermission(READ_PERMISSIONS as never)
  return granted.length > 0
}

/** Health Connect időszűrő a megadott tartományra. */
const timeFilter = (from: Date, to: Date) =>
  ({
    operator: 'between' as const,
    startTime: from.toISOString(),
    endTime: to.toISOString(),
  })

/**
 * Natívan összesíthető mérések.
 *
 * A `pick` azért van, mert minden rekordtípus MÁS mezőnévvel adja vissza az
 * eredményt (COUNT_TOTAL, BPM_AVG, DISTANCE.inMeters...). Egy közös alakra
 * hozzuk őket, hogy a szerver ugyanazt kapja, mint iOS-ről.
 */
type Aggregated = { metric: string; recordType: string; pick: (r: never) => Partial<DailySample> }

const AGGREGATED: Aggregated[] = [
  {
    metric: 'steps',
    recordType: 'Steps',
    pick: (r: { COUNT_TOTAL: number }) => ({ sum: r.COUNT_TOTAL }),
  },
  {
    metric: 'distance',
    recordType: 'Distance',
    // A Health Connect méterben ad – a szerver kilométert vár.
    pick: (r: { DISTANCE: { inMeters: number } }) => ({
      sum: Math.round((r.DISTANCE.inMeters / 1000) * 100) / 100,
    }),
  },
  {
    metric: 'activeEnergy',
    recordType: 'ActiveCaloriesBurned',
    pick: (r: { ACTIVE_CALORIES_TOTAL: { inKilocalories: number } }) => ({
      sum: Math.round(r.ACTIVE_CALORIES_TOTAL.inKilocalories),
    }),
  },
  {
    metric: 'exerciseMinutes',
    recordType: 'ExerciseSession',
    pick: (r: { EXERCISE_DURATION_TOTAL: { inSeconds: number } }) => ({
      sum: Math.round(r.EXERCISE_DURATION_TOTAL.inSeconds / 60),
    }),
  },
  {
    metric: 'heartRate',
    recordType: 'HeartRate',
    pick: (r: { BPM_AVG: number; BPM_MIN: number; BPM_MAX: number; MEASUREMENTS_COUNT: number }) => ({
      avg: r.BPM_AVG,
      min: r.BPM_MIN,
      max: r.BPM_MAX,
      count: r.MEASUREMENTS_COUNT,
    }),
  },
  {
    metric: 'restingHeartRate',
    recordType: 'RestingHeartRate',
    pick: (r: { BPM_AVG: number }) => ({ avg: r.BPM_AVG }),
  },
  {
    metric: 'bloodPressureSystolic',
    recordType: 'BloodPressure',
    pick: (r: { SYSTOLIC_AVG: { inMillimetersOfMercury: number } }) => ({
      avg: r.SYSTOLIC_AVG.inMillimetersOfMercury,
    }),
  },
  {
    metric: 'bloodPressureDiastolic',
    recordType: 'BloodPressure',
    pick: (r: { DIASTOLIC_AVG: { inMillimetersOfMercury: number } }) => ({
      avg: r.DIASTOLIC_AVG.inMillimetersOfMercury,
    }),
  },
  {
    metric: 'bodyMass',
    recordType: 'Weight',
    pick: (r: { WEIGHT_AVG: { inKilograms: number } }) => ({
      avg: Math.round(r.WEIGHT_AVG.inKilograms * 10) / 10,
    }),
  },
]

async function readAggregated(from: Date, to: Date): Promise<DailySample[]> {
  const out: DailySample[] = []

  for (const entry of AGGREGATED) {
    try {
      const groups = await aggregateGroupByPeriod({
        recordType: entry.recordType as never,
        timeRangeFilter: timeFilter(from, to),
        timeRangeSlicer: { period: 'DAYS', length: 1 },
      })

      for (const g of groups) {
        const values = entry.pick(g.result as never)
        // Az üres napokra is jön csoport, érték nélkül. Azokat kihagyjuk –
        // a "nincs adat" mást jelent, mint a nulla.
        const hasValue = Object.values(values).some((v) => typeof v === 'number' && !Number.isNaN(v))
        if (!hasValue) continue

        out.push({ metric: entry.metric, day: dayKey(g.startTime), count: 1, ...values })
      }
    } catch {
      // Egy hiányzó engedély vagy nem támogatott típus nem akaszthatja meg a többit.
      continue
    }
  }

  return out
}

/**
 * Amihez a Health Connect nem ad összesítést – itt számoljuk.
 *
 * Mind ritka mérés (naponta néhány), ezért a nyers rekordok beolvasása olcsó.
 */
const RAW: { metric: string; recordType: string; value: (r: never) => number | null }[] = [
  {
    metric: 'hrv',
    recordType: 'HeartRateVariabilityRmssd',
    value: (r: { heartRateVariabilityMillis: number }) => r.heartRateVariabilityMillis ?? null,
  },
  {
    metric: 'vo2max',
    recordType: 'Vo2Max',
    value: (r: { vo2MillilitersPerMinuteKilogram: number }) =>
      r.vo2MillilitersPerMinuteKilogram ?? null,
  },
  {
    metric: 'bodyFat',
    recordType: 'BodyFat',
    value: (r: { percentage: number }) => r.percentage ?? null,
  },
  {
    metric: 'leanBodyMass',
    recordType: 'LeanBodyMass',
    value: (r: { mass: { inKilograms: number } }) => r.mass?.inKilograms ?? null,
  },
]

async function readRaw(from: Date, to: Date): Promise<DailySample[]> {
  const out: DailySample[] = []

  for (const entry of RAW) {
    try {
      const { records } = await readRecords(entry.recordType as never, {
        timeRangeFilter: timeFilter(from, to),
      })

      // Naponta csoportosítva: átlag, szélsőértékek.
      const byDay = new Map<string, number[]>()
      for (const rec of records as { time?: string; startTime?: string }[]) {
        const value = entry.value(rec as never)
        if (value === null || !Number.isFinite(value)) continue

        const iso = rec.time ?? rec.startTime
        if (!iso) continue

        const day = dayKey(iso)
        const list = byDay.get(day) ?? []
        list.push(value)
        byDay.set(day, list)
      }

      for (const [day, values] of byDay) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        out.push({
          metric: entry.metric,
          day,
          avg: Math.round(avg * 100) / 100,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
        })
      }
    } catch {
      continue
    }
  }

  return out
}

/**
 * Alvás: hossz, mélyalvás és REM.
 *
 * A natív `SLEEP_DURATION_TOTAL` csak az össz-hosszt adja, fázisbontás nélkül –
 * és nem tudjuk, hogyan kezeli a több forrásból származó átfedést. Ezért a
 * nyers üléseket olvassuk, és ugyanazzal az összevonással dolgozunk, mint
 * iOS-en: két eszköz ugyanarra az éjszakára nem duplázza az alvásidőt.
 */
async function readSleepAndroid(from: Date, to: Date): Promise<DailySample[]> {
  type Night = { total: Interval[]; deep: Interval[]; rem: Interval[] }
  const byNight = new Map<string, Night>()

  try {
    const { records } = await readRecords('SleepSession', { timeRangeFilter: timeFilter(from, to) })

    for (const session of records as {
      startTime: string
      endTime: string
      stages?: { startTime: string; endTime: string; stage: number }[]
    }[]) {
      // Az éjszakát a VÉGE (a reggel) azonosítja – ugyanaz a szabály, mint iOS-en.
      const night = dayKey(session.endTime)
      const acc = byNight.get(night) ?? { total: [], deep: [], rem: [] }

      const stages = session.stages ?? []

      if (stages.length) {
        for (const s of stages) {
          // Az ébren töltött és az ágyon kívüli szakasz NEM alvás.
          if (s.stage === SleepStageType.AWAKE || s.stage === SleepStageType.OUT_OF_BED) continue

          const iv: Interval = {
            start: new Date(s.startTime).getTime(),
            end: new Date(s.endTime).getTime(),
          }
          acc.total.push(iv)
          if (s.stage === SleepStageType.DEEP) acc.deep.push(iv)
          if (s.stage === SleepStageType.REM) acc.rem.push(iv)
        }
      } else {
        // Fázisbontás nélküli ülés (sok alkalmazás csak ennyit ad): a teljes
        // időszak alvásnak számít, fázisok nélkül.
        acc.total.push({
          start: new Date(session.startTime).getTime(),
          end: new Date(session.endTime).getTime(),
        })
      }

      byNight.set(night, acc)
    }
  } catch {
    return []
  }

  const out: DailySample[] = []
  const round = (n: number) => Math.round(n * 100) / 100

  for (const [day, v] of byNight) {
    const total = coveredHours(v.total)
    const deep = coveredHours(v.deep)
    const rem = coveredHours(v.rem)

    if (total > 0) out.push({ metric: 'sleepDuration', day, sum: round(total), count: 1 })
    if (deep > 0) out.push({ metric: 'sleepDeep', day, sum: round(deep), count: 1 })
    if (rem > 0) out.push({ metric: 'sleepRem', day, sum: round(rem), count: 1 })
  }

  return out
}

/** Minden Android-oldali mérés beolvasása. */
export async function readAndroidHealth(from: Date, to: Date): Promise<DailySample[]> {
  const [aggregated, raw, sleep] = await Promise.all([
    readAggregated(from, to),
    readRaw(from, to),
    readSleepAndroid(from, to),
  ])
  return [...aggregated, ...raw, ...sleep]
}
