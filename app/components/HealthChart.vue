<script setup lang="ts">
/**
 * Egy mérés idősora az orvosi nézetben.
 *
 * Kézzel rajzolt SVG, nem diagram-könyvtár. Három oka van:
 *   - egyetlen extra csomag sem kerül a kliens bundle-jébe,
 *   - a szerveroldali renderelés gond nélkül működik,
 *   - pontosan azt rajzolja, amire szükség van (napi átlag + min–max sáv),
 *     amit a legtöbb könyvtárban külön kellene összeeszkábálni.
 *
 * Három ábratípus, a mérés természete szerint:
 *   bars   – ami halmozódik (lépés, alvásidő): napi oszlopok
 *   range  – ami ingadozik (pulzus, vérnyomás): vonal + min–max sáv
 *   line   – ami lassan változik (testsúly, VO2max): sima vonal
 */

type Point = {
  day: string
  value: number
  min: number | null
  max: number | null
  count: number
}

const props = defineProps<{
  points: Point[]
  chart: 'bars' | 'range' | 'line'
  unit: string
  decimals: number
  reference?: { min?: number; max?: number; note?: string } | null
}>()

const W = 720
const H = 180
const PAD = { top: 12, right: 8, bottom: 22, left: 44 }

const plot = computed(() => {
  const pts = props.points
  if (!pts.length) return null

  // A függőleges skála a min–max sávot is befogja, különben a sáv kilógna.
  const lows = pts.map((p) => p.min ?? p.value)
  const highs = pts.map((p) => p.max ?? p.value)

  let lo = Math.min(...lows)
  let hi = Math.max(...highs)

  // A referenciasáv is férjen bele, hogy látszódjon, hol áll hozzá a páciens.
  if (props.reference?.min !== undefined) lo = Math.min(lo, props.reference.min)
  if (props.reference?.max !== undefined) hi = Math.max(hi, props.reference.max)

  // Az oszlopdiagram mindig a NULLÁTÓL indul – különben a magasságok arányai
  // hazudnának: a kétszer akkora oszlop nem kétszer akkora értéket jelentene.
  if (props.chart === 'bars') lo = Math.min(0, lo)

  if (hi === lo) {
    hi = lo + 1
    lo = lo - 1
  } else if (props.chart === 'bars') {
    hi += (hi - lo) * 0.1
  } else {
    const pad = (hi - lo) * 0.1
    hi += pad
    lo -= pad
  }

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const x = (i: number) =>
    PAD.left + (pts.length === 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH

  return { pts, lo, hi, x, y, innerW, innerH }
})

/** Vonal a napi értékekből. */
const linePath = computed(() => {
  const p = plot.value
  if (!p) return ''
  return p.pts
    .map((pt, i) => `${i ? 'L' : 'M'}${p.x(i).toFixed(1)},${p.y(pt.value).toFixed(1)}`)
    .join('')
})

/** Zárt alakzat a min–max tartományhoz. */
const bandPath = computed(() => {
  const p = plot.value
  if (!p || props.chart !== 'range') return ''
  if (!p.pts.some((pt) => pt.min !== null && pt.max !== null)) return ''

  const top = p.pts
    .map((pt, i) => `${i ? 'M' : 'M'}${p.x(i).toFixed(1)},${p.y(pt.max ?? pt.value).toFixed(1)}`)
    .map((s, i) => (i ? s.replace('M', 'L') : s))
    .join('')

  const bottom = p.pts
    .map((_, i) => p.pts.length - 1 - i)
    .map((idx) => {
      const pt = p.pts[idx]!
      return `L${p.x(idx).toFixed(1)},${p.y(pt.min ?? pt.value).toFixed(1)}`
    })
    .join('')

  return `${top}${bottom}Z`
})

const bars = computed(() => {
  const p = plot.value
  if (!p || props.chart !== 'bars') return []
  // Az oszlopszélesség a napok számából; legalább 1 képpont, hogy sok nap
  // esetén se tűnjön el.
  const w = Math.max(1, Math.min(14, p.innerW / p.pts.length - 1))
  const zero = p.y(Math.max(0, p.lo))
  return p.pts.map((pt, i) => {
    const yv = p.y(pt.value)
    return { x: p.x(i) - w / 2, y: Math.min(yv, zero), w, h: Math.abs(zero - yv) || 1 }
  })
})

/** Referenciasáv téglalapja, ha értelmezhető. */
const refBand = computed(() => {
  const p = plot.value
  const r = props.reference
  if (!p || !r || (r.min === undefined && r.max === undefined)) return null
  const top = p.y(r.max ?? p.hi)
  const bottom = p.y(r.min ?? p.lo)
  return { y: Math.min(top, bottom), h: Math.abs(bottom - top) }
})

/** Három vízszintes segédvonal, olvasható értékekkel. */
const ticks = computed(() => {
  const p = plot.value
  if (!p) return []
  return [0, 0.5, 1].map((f) => {
    const v = p.lo + (p.hi - p.lo) * f
    return { v, y: p.y(v) }
  })
})

const fmt = (v: number) =>
  new Intl.NumberFormat('hu-HU', {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  }).format(v)

/** Az első és az utolsó nap felirata – a köztes napok zsúfolnának. */
const edgeLabels = computed(() => {
  const p = plot.value
  if (!p) return null
  const d = (s: string) =>
    new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' }).format(new Date(s))
  return { first: d(p.pts[0]!.day), last: d(p.pts[p.pts.length - 1]!.day) }
})
</script>

<template>
  <svg
    v-if="plot"
    :viewBox="`0 0 ${W} ${H}`"
    class="w-full h-auto"
    role="img"
    :aria-label="`Idősor, ${plot.pts.length} nap, mértékegység: ${unit}`"
  >
    <!-- Referenciasáv: tájékoztató tartomány, nem minősítés -->
    <rect
      v-if="refBand"
      :x="PAD.left"
      :y="refBand.y"
      :width="W - PAD.left - PAD.right"
      :height="refBand.h"
      fill="#153131"
      opacity="0.06"
    />

    <!-- Segédvonalak és skála -->
    <line
      v-for="t in ticks"
      :key="`t-${t.v}`"
      :x1="PAD.left"
      :x2="W - PAD.right"
      :y1="t.y"
      :y2="t.y"
      stroke="#000"
      stroke-opacity="0.08"
    />
    <text
      v-for="t in ticks"
      :key="`l-${t.v}`"
      :x="PAD.left - 6"
      :y="t.y + 3"
      text-anchor="end"
      font-size="10"
      fill="#667085"
    >{{ fmt(t.v) }}</text>

    <!-- Min–max sáv -->
    <path v-if="bandPath" :d="bandPath" fill="#153131" opacity="0.14" />

    <!-- Oszlopok -->
    <rect
      v-for="(b, i) in bars"
      :key="`b-${i}`"
      :x="b.x"
      :y="b.y"
      :width="b.w"
      :height="b.h"
      fill="#153131"
      rx="1"
    />

    <!-- Vonal -->
    <path
      v-if="chart !== 'bars'"
      :d="linePath"
      fill="none"
      stroke="#153131"
      stroke-width="2"
      stroke-linejoin="round"
      stroke-linecap="round"
    />

    <!-- Az utolsó mérés kiemelve -->
    <circle
      v-if="chart !== 'bars' && plot.pts.length"
      :cx="plot.x(plot.pts.length - 1)"
      :cy="plot.y(plot.pts[plot.pts.length - 1]!.value)"
      r="3.5"
      fill="#153131"
    />

    <!-- Dátumok a két szélen -->
    <text v-if="edgeLabels" :x="PAD.left" :y="H - 6" font-size="10" fill="#667085">
      {{ edgeLabels.first }}
    </text>
    <text
      v-if="edgeLabels"
      :x="W - PAD.right"
      :y="H - 6"
      text-anchor="end"
      font-size="10"
      fill="#667085"
    >{{ edgeLabels.last }}</text>
  </svg>

  <p v-else class="text-[#667085] text-sm">Ehhez a méréshez nincs adat a vizsgált időszakban.</p>
</template>
