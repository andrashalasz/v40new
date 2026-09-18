import { PrismaClient } from '@prisma/client'
import { CATEGORIES } from '../server/health/catalog'

/**
 * DEMÓ egészségügyi adat egy pácienshez – FEJLESZTÉSHEZ ÉS BEMUTATÓHOZ.
 *
 * Élesben ezt az adatot a páciens telefonja küldi. Ez a script csak azért van,
 * hogy az orvosi nézet fejleszthető és bemutatható legyen, mielőtt a HealthKit
 * integráció elkészül.
 *
 * Az adat szándékosan ÉLETSZERŰ: hétvégén kevesebb lépés, éjszakánként ingadozó
 * pulzus, hiányzó napok (a felhasználó nem hordta az órát). Sima, tökéletes
 * adaton minden diagram szépen fest – a hiányos adat mutatja meg, hogy a
 * felület valóban működik-e.
 *
 * Futtatás:  npx tsx scripts/seed-health-demo.ts <email>
 */

const prisma = new PrismaClient()

const DAYS = 120
const TZ = 'Europe/Budapest'

/** Determinisztikus álvéletlen: ugyanaz a mag ugyanazt az adatot adja. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const dayString = (offset: number) =>
  new Date(Date.now() - offset * 86400_000).toLocaleDateString('sv-SE', { timeZone: TZ })

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Használat: npx tsx scripts/seed-health-demo.ts <email>')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) {
    console.error(`Nincs ilyen felhasználó: ${email}`)
    process.exit(1)
  }

  // Hozzájárulás mind a négy kategóriához – enélkül a nézet üres lenne.
  for (const c of CATEGORIES) {
    await prisma.healthConsent.upsert({
      where: { userId_category: { userId: user.id, category: c.key } },
      update: { revokedAt: null },
      create: { userId: user.id, category: c.key, platform: 'ios' },
    })
  }

  const r = rng(20260918)

  // A 60. nap környékén "kezelés" – utána kedvezőbb értékek, hogy az
  // előtte/utána összehasonlítás kipróbálható legyen.
  const TREATMENT_AT = 60

  const rows: {
    metric: string
    day: string
    sum?: number
    avg?: number
    min?: number
    max?: number
    count: number
    unit: string
  }[] = []

  for (let offset = DAYS; offset >= 0; offset--) {
    const day = dayString(offset)
    const date = new Date(`${day}T12:00:00Z`)
    const weekend = [0, 6].includes(date.getUTCDay())
    const after = offset < TREATMENT_AT

    // Néhány nap hiányzik: nem hordta az órát. Ez teszi életszerűvé.
    if (r() < 0.07) continue

    const push = (metric: string, unit: string, v: Partial<(typeof rows)[number]>) =>
      rows.push({ metric, day, unit, count: 1, ...v } as (typeof rows)[number])

    // --- Aktivitás ---
    const baseSteps = weekend ? 5200 : 8600
    push('steps', 'lépés', { sum: Math.round(baseSteps * (0.7 + r() * 0.6) + (after ? 900 : 0)), count: 1 })
    push('activeEnergy', 'kcal', { sum: Math.round(320 * (0.7 + r() * 0.7) + (after ? 60 : 0)) })
    push('exerciseMinutes', 'perc', { sum: Math.round((weekend ? 18 : 28) * (0.5 + r())) })
    push('distance', 'km', { sum: Number(((baseSteps / 1400) * (0.7 + r() * 0.6)).toFixed(1)) })

    // --- Szív ---
    const rhr = 62 - (after ? 3 : 0) + (r() * 6 - 3)
    push('restingHeartRate', 'bpm', { avg: Math.round(rhr) })
    push('heartRate', 'bpm', {
      avg: Math.round(rhr + 12 + r() * 6),
      min: Math.round(rhr - 6),
      max: Math.round(rhr + 70 + r() * 25),
      count: 480,
    })
    push('hrv', 'ms', { avg: Math.round(38 + (after ? 6 : 0) + r() * 14) })

    // Vérnyomás nem minden nap – nem mindenki mér naponta.
    if (r() < 0.45) {
      push('bloodPressureSystolic', 'Hgmm', { avg: Math.round(132 - (after ? 6 : 0) + r() * 10) })
      push('bloodPressureDiastolic', 'Hgmm', { avg: Math.round(85 - (after ? 4 : 0) + r() * 7) })
    }
    if (offset % 21 === 0) {
      push('vo2max', 'ml/kg/min', { avg: Number((34 + (after ? 1.8 : 0) + r()).toFixed(1)) })
    }

    // --- Alvás ---
    const sleep = 6.6 + (after ? 0.6 : 0) + r() * 1.6
    push('sleepDuration', 'óra', { sum: Number(sleep.toFixed(1)) })
    push('sleepDeep', 'óra', { sum: Number((sleep * (0.13 + r() * 0.06)).toFixed(1)) })
    push('sleepRem', 'óra', { sum: Number((sleep * (0.18 + r() * 0.07)).toFixed(1)) })
    push('sleepingHeartRate', 'bpm', { avg: Math.round(rhr - 4 + r() * 4) })

    // --- Testösszetétel: nem naponta mér mindenki ---
    if (r() < 0.35) {
      const weight = 84 - (after ? 2.4 : 0) - offset * 0.004 + r() * 0.8
      push('bodyMass', 'kg', { avg: Number(weight.toFixed(1)) })
      push('bmi', 'kg/m²', { avg: Number((weight / (1.8 * 1.8)).toFixed(1)) })
      push('bodyFat', '%', { avg: Number((26 - (after ? 1.4 : 0) + r()).toFixed(1)) })
      push('leanBodyMass', 'kg', { avg: Number((weight * 0.72 + r() * 0.4).toFixed(1)) })
    }
  }

  // Régi demóadat törlése, hogy az ismételt futtatás ne keveredjen.
  await prisma.healthDailyMetric.deleteMany({ where: { userId: user.id } })

  for (const row of rows) {
    await prisma.healthDailyMetric.create({
      data: {
        userId: user.id,
        metric: row.metric,
        day: new Date(`${row.day}T00:00:00Z`),
        sum: row.sum ?? null,
        avg: row.avg ?? null,
        min: row.min ?? null,
        max: row.max ?? null,
        count: row.count ?? 1,
        unit: row.unit,
        source: 'apple_health',
      },
    })
  }

  await prisma.healthSyncState.upsert({
    where: { userId_platform: { userId: user.id, platform: 'ios' } },
    update: { lastSyncedDay: new Date(`${dayString(0)}T00:00:00Z`) },
    create: { userId: user.id, platform: 'ios', lastSyncedDay: new Date(`${dayString(0)}T00:00:00Z`) },
  })

  console.log(`Demó adat kész: ${rows.length} napi érték, ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
