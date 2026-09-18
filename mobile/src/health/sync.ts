import { Platform } from 'react-native'
import { api } from '../api/client'
import { METRICS_BY_CATEGORY } from './metrics'
import { readQuantityMetrics, readSleep, type DailySample } from './read'
import { readAndroidHealth } from './read.android'

/** A szerver ezt tárolja az adat forrásaként (apple_health / health_connect). */
const PLATFORM = Platform.OS === 'android' ? ('android' as const) : ('ios' as const)

/**
 * A beolvasott napi értékek felküldése a szerverre.
 *
 * ADAGOLVA megy: a szerver kérésenként 2000 tételt fogad. Egy év × 18 mérés
 * néhány ezer sor, ami egy kérésben időtúllépést okozhatna gyenge hálózaton –
 * és ha megszakad, az egész elveszne. Adagolva a már feltöltött rész megmarad,
 * mert a szinkron idempotens: az újraküldés felülír, nem duplikál.
 */

const BATCH = 500

export type SyncResult = {
  read: number
  written: number
  rejected: number
  /** Mely mérésekhez egyáltalán nem jött adat – ez a leggyakoribb kérdés. */
  emptyMetrics: string[]
}

export type SyncProgress = {
  phase: 'reading' | 'uploading' | 'done'
  /** 0–1 közötti arány a feltöltésnél. */
  ratio: number
}

/**
 * Teljes szinkron: beolvasás a HealthKitből, majd feltöltés.
 *
 * @param days hány napra visszamenőleg
 * @param onProgress a felület visszajelzéséhez – egy éves szinkron több
 *        másodperc, és visszajelzés nélkül úgy néz ki, mintha megállt volna
 */
export async function syncHealth(
  days: number,
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncResult> {
  const to = new Date()
  const from = new Date(to.getTime() - days * 86400_000)
  from.setHours(0, 0, 0, 0)

  onProgress?.({ phase: 'reading', ratio: 0 })

  // A két platform adattára más felépítésű, de UGYANAZT a napi alakot adja
  // vissza – innentől a feltöltés azonos.
  const samples: DailySample[] =
    Platform.OS === 'android'
      ? await readAndroidHealth(from, to)
      : (
          await Promise.all([readQuantityMetrics(from, to), readSleep(from, to)])
        ).flat()

  // A listát a kategória-táblából vezetjük le, nem külön felsorolva: így egy
  // új mérés hozzáadásakor nem marad ki innen.
  const present = new Set(samples.map((s) => s.metric))
  const emptyMetrics = Object.values(METRICS_BY_CATEGORY)
    .flat()
    .filter((m) => !present.has(m))

  let written = 0
  let rejected = 0

  for (let i = 0; i < samples.length; i += BATCH) {
    const chunk = samples.slice(i, i + BATCH)
    const res = await api<{ written: number; rejectedCount: number }>(
      '/api/mobile/health/sync',
      { body: { platform: PLATFORM, samples: chunk } },
    )
    written += res.written
    rejected += res.rejectedCount
    onProgress?.({ phase: 'uploading', ratio: Math.min(1, (i + BATCH) / samples.length) })
  }

  onProgress?.({ phase: 'done', ratio: 1 })

  return { read: samples.length, written, rejected, emptyMetrics }
}

/** Hozzájárulás állítása egy kategóriához. */
export function setConsent(category: string, granted: boolean) {
  return api<{ category: string; granted: boolean }>('/api/mobile/health/consent', {
    body: { category, granted, platform: PLATFORM },
  })
}
