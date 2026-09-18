import type { QuantityTypeIdentifier } from '@kingstinct/react-native-healthkit'

/**
 * A telefonon beolvasandó mérések – a szerver katalógusának iOS-oldali párja
 * (server/health/catalog.ts).
 *
 * Miért van külön lista: a szerver katalógusa a MEGJELENÍTÉST írja le (mit hogy
 * rajzolunk), ez pedig a BEOLVASÁST (melyik HealthKit típus, milyen
 * mértékegységben, hogyan összesítve). A kettő kulcsa azonos (`key`), és a
 * `npm run typecheck` nem fogja meg, ha elcsúsznak – ezért van rá teszt
 * (tests/health/catalog-sync.test.ts a backend oldalán).
 *
 * A mértékegységet MINDIG kifejezetten megadjuk. Enélkül a HealthKit a
 * felhasználó területi beállítását követné: egy angol nyelvre állított
 * készüléken a testsúly fontban, a távolság mérföldben jönne – és a szerveren
 * senki nem venné észre, mert a szám önmagában hihető marad.
 */

export type QuantityMetric = {
  key: string
  identifier: QuantityTypeIdentifier
  unit: string
  /** Napi összesítés módja – ugyanaz a fogalom, mint a szerver katalógusában. */
  aggregation: 'sum' | 'average' | 'latest'
}

export const QUANTITY_METRICS: QuantityMetric[] = [
  // --- Aktivitás és mozgás ---
  { key: 'steps', identifier: 'HKQuantityTypeIdentifierStepCount', unit: 'count', aggregation: 'sum' },
  {
    key: 'activeEnergy',
    identifier: 'HKQuantityTypeIdentifierActiveEnergyBurned',
    unit: 'kcal',
    aggregation: 'sum',
  },
  {
    key: 'exerciseMinutes',
    identifier: 'HKQuantityTypeIdentifierAppleExerciseTime',
    unit: 'min',
    aggregation: 'sum',
  },
  {
    key: 'distance',
    identifier: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
    unit: 'km',
    aggregation: 'sum',
  },
  {
    key: 'standHours',
    identifier: 'HKQuantityTypeIdentifierAppleStandTime',
    unit: 'hr',
    aggregation: 'sum',
  },

  // --- Szív és keringés ---
  { key: 'heartRate', identifier: 'HKQuantityTypeIdentifierHeartRate', unit: 'count/min', aggregation: 'average' },
  {
    key: 'restingHeartRate',
    identifier: 'HKQuantityTypeIdentifierRestingHeartRate',
    unit: 'count/min',
    aggregation: 'average',
  },
  {
    key: 'hrv',
    identifier: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
    unit: 'ms',
    aggregation: 'average',
  },
  {
    key: 'bloodPressureSystolic',
    identifier: 'HKQuantityTypeIdentifierBloodPressureSystolic',
    unit: 'mmHg',
    aggregation: 'average',
  },
  {
    key: 'bloodPressureDiastolic',
    identifier: 'HKQuantityTypeIdentifierBloodPressureDiastolic',
    unit: 'mmHg',
    aggregation: 'average',
  },
  {
    key: 'vo2max',
    identifier: 'HKQuantityTypeIdentifierVO2Max',
    unit: 'ml/(kg*min)',
    aggregation: 'latest',
  },

  // Az alvásfázisok nem mennyiségi típusok – azokat a readSleep olvassa.
  //
  // „Alvás közbeni pulzus" szándékosan NINCS: a HealthKit nem ad ilyen
  // mérést, kiszámolni pedig éjszakánként külön lekérdezéssel lehetne, ami egy
  // évre 365 hívás. A NYUGALMI pulzust az Apple maga is jórészt az inaktív és
  // alvási időszakokból számolja, tehát a klinikailag érdekes részt lefedi.

  // --- Testösszetétel ---
  { key: 'bodyMass', identifier: 'HKQuantityTypeIdentifierBodyMass', unit: 'kg', aggregation: 'latest' },
  { key: 'bmi', identifier: 'HKQuantityTypeIdentifierBodyMassIndex', unit: 'count', aggregation: 'latest' },
  {
    key: 'bodyFat',
    identifier: 'HKQuantityTypeIdentifierBodyFatPercentage',
    unit: '%',
    aggregation: 'latest',
  },
  {
    key: 'leanBodyMass',
    identifier: 'HKQuantityTypeIdentifierLeanBodyMass',
    unit: 'kg',
    aggregation: 'latest',
  },
  {
    key: 'waistCircumference',
    identifier: 'HKQuantityTypeIdentifierWaistCircumference',
    unit: 'cm',
    aggregation: 'latest',
  },
]

/** Melyik mérés melyik kategóriához tartozik – az engedélykéréshez. */
export const METRICS_BY_CATEGORY: Record<string, string[]> = {
  activity: ['steps', 'activeEnergy', 'exerciseMinutes', 'distance', 'standHours'],
  cardio: ['heartRate', 'restingHeartRate', 'hrv', 'bloodPressureSystolic', 'bloodPressureDiastolic', 'vo2max'],
  sleep: ['sleepDuration', 'sleepDeep', 'sleepRem'],
  body: ['bodyMass', 'bmi', 'bodyFat', 'leanBodyMass', 'waistCircumference'],
}

/** Az alvás nem mennyiségi, hanem kategória-típus – külön kezeljük. */
export const SLEEP_IDENTIFIER = 'HKCategoryTypeIdentifierSleepAnalysis' as const

/** Minden HealthKit típus, amihez olvasási engedélyt kérünk. */
export const ALL_READ_IDENTIFIERS = [
  ...new Set<string>(QUANTITY_METRICS.map((m) => m.identifier)),
  SLEEP_IDENTIFIER,
]
