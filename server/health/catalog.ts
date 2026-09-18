/**
 * EGÉSZSÉGÜGYI ADATOK KATALÓGUSA
 *
 * Ez az egyetlen hely, ahol le van írva, hogy az alkalmazás milyen adatot kér
 * el, hogyan kell összesíteni, és hogyan jelenik meg az orvosnak. Az app, a
 * szinkron-végpont és az admin felület MIND innen dolgozik – így nem fordulhat
 * elő, hogy az app többet kér, mint amennyit megjelenítünk, vagy hogy egy
 * mérés máshogy összesül a két platformon.
 *
 * MIÉRT KATEGÓRIÁNKÉNT, ÉS NEM „minden adat":
 *
 *   Az Apple Health több mint 100 adattípust ismer (fogmosás, UV-terhelés,
 *   esések száma, hallásvizsgálat). Az Apple és a Google is TÍPUSONKÉNT kéri az
 *   indoklást a review során, és a túl tág hozzáférés a leggyakoribb elutasítási
 *   ok egészségügyi alkalmazásoknál. A GDPR adattakarékossági elve (5. cikk)
 *   ugyanezt kívánja: csak az kezelhető, ami a célhoz kell.
 *
 *   Ezért NÉGY kategória van, az orvosi igény szerint: alvás, mozgás (fittség),
 *   szív/keringés és testösszetétel. A páciens kategóriánként engedélyez, és
 *   bármikor visszavon.
 *
 * BŐVÍTÉS: további kategóriát (táplálkozás, ciklus/menopauza, anyagcsere,
 * légzés, mentális jóllét) ehhez a tömbhöz elég hozzáadni – a szinkron, az
 * engedélykérés és az orvosi nézet automatikusan követi. FIGYELEM: a HealthKit
 * és a Health Connect engedélyei a natív build részei, ezért új kategóriához
 * ÚJ APPVERZIÓ és a store-engedélyek felülvizsgálata is kell.
 */

/** Hogyan kell egy napra összesíteni a mintákat. */
export type Aggregation =
  /** Napi ÖSSZEG – ami halmozódik: lépés, elégetett energia, víz. */
  | 'sum'
  /** Napi ÁTLAG + szélsőértékek – ami pillanatnyi állapot: pulzus, vércukor. */
  | 'average'
  /** A nap UTOLSÓ mérése – ami lassan változó állapot: testsúly, testzsír. */
  | 'latest'

/** Hogyan rajzoljuk ki az orvosnak. */
export type ChartKind =
  /** Oszlopdiagram – napi összegekhez (lépés, alvás). */
  | 'bars'
  /** Vonal a napi átlaggal, körülötte sávval a min–max tartomány. */
  | 'range'
  /** Egyszerű vonal – lassan változó értékekhez (testsúly). */
  | 'line'

export type Metric = {
  /** Belső kulcs – ez kerül az adatbázisba. */
  key: string
  /** Magyar megnevezés az orvosi nézetben. */
  label: string
  unit: string
  aggregation: Aggregation
  chart: ChartKind
  /**
   * Az egészséges tartomány, ha van értelmezhető. CSAK tájékoztató sáv a
   * diagramon – NEM diagnózis, és nem is minősítjük vele az értéket. A
   * megítélés az orvos dolga; az app nem mond véleményt, mert azzal
   * orvostechnikai eszközzé válna.
   */
  reference?: { min?: number; max?: number; note?: string }
  /** Tizedesjegyek a megjelenítéshez. */
  decimals?: number
  /** Apple HealthKit azonosító. */
  ios?: string
  /** Android Health Connect rekordtípus. */
  android?: string
}

export type Category = {
  key: string
  label: string
  /** Egy mondat a pácienskénti engedélykérő képernyőre. */
  purpose: string
  metrics: Metric[]
}

export const CATEGORIES: Category[] = [
  {
    key: 'activity',
    label: 'Aktivitás és mozgás',
    purpose:
      'A napi mozgásmennyiség és az edzések követése, hogy a longevity program terhelése a valós aktivitásodhoz igazodjon.',
    metrics: [
      {
        key: 'steps',
        label: 'Lépésszám',
        unit: 'lépés',
        aggregation: 'sum',
        chart: 'bars',
        reference: { min: 7000, note: 'Napi 7–10 ezer lépés a szokásos ajánlás.' },
        ios: 'HKQuantityTypeIdentifierStepCount',
        android: 'Steps',
      },
      {
        key: 'activeEnergy',
        label: 'Aktív energialeadás',
        unit: 'kcal',
        aggregation: 'sum',
        chart: 'bars',
        ios: 'HKQuantityTypeIdentifierActiveEnergyBurned',
        android: 'ActiveCaloriesBurned',
      },
      {
        key: 'exerciseMinutes',
        label: 'Edzésidő',
        unit: 'perc',
        aggregation: 'sum',
        chart: 'bars',
        reference: { min: 21, note: 'Heti 150 perc mérsékelt mozgás ajánlott.' },
        ios: 'HKQuantityTypeIdentifierAppleExerciseTime',
        android: 'ExerciseSession',
      },
      {
        key: 'distance',
        label: 'Megtett távolság',
        unit: 'km',
        aggregation: 'sum',
        chart: 'bars',
        decimals: 1,
        ios: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
        android: 'Distance',
      },
      {
        key: 'standHours',
        label: 'Állással töltött órák',
        unit: 'óra',
        aggregation: 'sum',
        chart: 'bars',
        ios: 'HKQuantityTypeIdentifierAppleStandTime',
      },
    ],
  },

  {
    key: 'cardio',
    label: 'Szív és keringés',
    purpose:
      'A szívfrekvencia, a vérnyomás és a terhelhetőség követése – ez a CardioMérleg és a longevity felmérés alapja.',
    metrics: [
      {
        key: 'heartRate',
        label: 'Pulzus',
        unit: 'bpm',
        aggregation: 'average',
        chart: 'range',
        ios: 'HKQuantityTypeIdentifierHeartRate',
        android: 'HeartRate',
      },
      {
        key: 'restingHeartRate',
        label: 'Nyugalmi pulzus',
        unit: 'bpm',
        aggregation: 'average',
        chart: 'line',
        reference: { min: 50, max: 70, note: 'A tartósan emelkedő nyugalmi pulzus jelzésértékű.' },
        ios: 'HKQuantityTypeIdentifierRestingHeartRate',
        android: 'RestingHeartRate',
      },
      {
        key: 'hrv',
        label: 'Szívfrekvencia-variabilitás',
        unit: 'ms',
        aggregation: 'average',
        chart: 'line',
        reference: { note: 'Egyénenként nagyon eltérő – a saját trend számít, nem az abszolút érték.' },
        ios: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        android: 'HeartRateVariabilityRmssd',
      },
      {
        key: 'bloodPressureSystolic',
        label: 'Vérnyomás – szisztolés',
        unit: 'Hgmm',
        aggregation: 'average',
        chart: 'range',
        reference: { max: 130 },
        ios: 'HKQuantityTypeIdentifierBloodPressureSystolic',
        android: 'BloodPressure',
      },
      {
        key: 'bloodPressureDiastolic',
        label: 'Vérnyomás – diasztolés',
        unit: 'Hgmm',
        aggregation: 'average',
        chart: 'range',
        reference: { max: 85 },
        ios: 'HKQuantityTypeIdentifierBloodPressureDiastolic',
        android: 'BloodPressure',
      },
      {
        key: 'vo2max',
        label: 'VO₂max',
        unit: 'ml/kg/min',
        aggregation: 'latest',
        chart: 'line',
        decimals: 1,
        reference: { note: 'A kardiorespiratorikus fittség mutatója; a várható élettartam egyik legerősebb előrejelzője.' },
        ios: 'HKQuantityTypeIdentifierVO2Max',
        android: 'Vo2Max',
      },
    ],
  },

  {
    key: 'sleep',
    label: 'Alvás',
    purpose:
      'Az alvás hossza és minősége – a regeneráció, a hormonháztartás és az anyagcsere egyik meghatározója.',
    metrics: [
      {
        key: 'sleepDuration',
        label: 'Alvásidő',
        unit: 'óra',
        aggregation: 'sum',
        chart: 'bars',
        decimals: 1,
        reference: { min: 7, max: 9 },
        ios: 'HKCategoryTypeIdentifierSleepAnalysis',
        android: 'SleepSession',
      },
      {
        key: 'sleepDeep',
        label: 'Mélyalvás',
        unit: 'óra',
        aggregation: 'sum',
        chart: 'bars',
        decimals: 1,
        ios: 'HKCategoryTypeIdentifierSleepAnalysis',
        android: 'SleepSession',
      },
      {
        key: 'sleepRem',
        label: 'REM alvás',
        unit: 'óra',
        aggregation: 'sum',
        chart: 'bars',
        decimals: 1,
        ios: 'HKCategoryTypeIdentifierSleepAnalysis',
        android: 'SleepSession',
      },
    ],
  },

  {
    key: 'body',
    label: 'Testösszetétel',
    purpose: 'Testsúly és testösszetétel követése a súlycsökkentő és longevity programokhoz.',
    metrics: [
      {
        key: 'bodyMass',
        label: 'Testsúly',
        unit: 'kg',
        aggregation: 'latest',
        chart: 'line',
        decimals: 1,
        ios: 'HKQuantityTypeIdentifierBodyMass',
        android: 'Weight',
      },
      {
        key: 'bmi',
        label: 'Testtömegindex',
        unit: 'kg/m²',
        aggregation: 'latest',
        chart: 'line',
        decimals: 1,
        reference: { min: 18.5, max: 25 },
        ios: 'HKQuantityTypeIdentifierBodyMassIndex',
        android: 'Weight',
      },
      {
        key: 'bodyFat',
        label: 'Testzsírszázalék',
        unit: '%',
        aggregation: 'latest',
        chart: 'line',
        decimals: 1,
        ios: 'HKQuantityTypeIdentifierBodyFatPercentage',
        android: 'BodyFat',
      },
      {
        key: 'leanBodyMass',
        label: 'Izomtömeg',
        unit: 'kg',
        aggregation: 'latest',
        chart: 'line',
        decimals: 1,
        reference: { note: 'Az izomtömeg megőrzése 40 felett a funkcionális öregedés kulcskérdése.' },
        ios: 'HKQuantityTypeIdentifierLeanBodyMass',
        android: 'LeanBodyMass',
      },
      {
        key: 'waistCircumference',
        label: 'Derékkörfogat',
        unit: 'cm',
        aggregation: 'latest',
        chart: 'line',
        decimals: 1,
        ios: 'HKQuantityTypeIdentifierWaistCircumference',
      },
    ],
  },
]

// --- Kereső segédek ---------------------------------------------------------

/** Kategória kulcs -> kategória. */
export const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]))

/** Mérés kulcs -> { mérés, a kategóriája }. */
export const METRIC_BY_KEY = new Map(
  CATEGORIES.flatMap((c) => c.metrics.map((m) => [m.key, { metric: m, category: c }] as const)),
)

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key)

/** Egy mérés melyik kategóriába tartozik – a hozzájárulás ellenőrzéséhez. */
export function categoryOfMetric(metricKey: string): string | null {
  return METRIC_BY_KEY.get(metricKey)?.category.key ?? null
}
