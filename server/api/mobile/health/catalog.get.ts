import { CATEGORIES } from '~~/server/health/catalog'

/**
 * Mit kér az alkalmazás, és miért.
 *
 * Az app ebből építi az engedélykérő képernyőt, és ebből tudja, mely
 * platform-azonosítókat kell lekérdeznie. Így a katalógus bővítéséhez nem kell
 * új appverziót kiadni – de figyelem: a HealthKit és a Health Connect
 * ENGEDÉLYEI a natív build részei, azokhoz mégis kiadás kell. A katalógus
 * bővítésekor tehát a store-engedélyeket is felül kell vizsgálni.
 */
export default defineEventHandler(() =>
  CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    purpose: c.purpose,
    metrics: c.metrics.map((m) => ({
      key: m.key,
      label: m.label,
      unit: m.unit,
      aggregation: m.aggregation,
      ios: m.ios ?? null,
      android: m.android ?? null,
    })),
  })),
)
