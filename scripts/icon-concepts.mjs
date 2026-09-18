import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

/**
 * App-ikon koncepciók – ÖSSZEHASONLÍTÁSHOZ, nem véglegesítéshez.
 *
 * A jó app-ikon szabályai, amikre itt figyelünk:
 *   - 40 képponton is felismerhető (a Beállítások listájában ekkora),
 *   - EGY erős forma, nem több apró elem,
 *   - vastag vonalak: a vékony vonal kicsiben eltűnik vagy szürke masszává mosódik,
 *   - nagy kontraszt, hogy sötét és világos háttéren is megálljon.
 *
 * A színek a weboldal arculatából valók.
 */

const INK = '#153131' // sötétzöld
const CREAM = '#F4F4F0'
const MINT = '#E5F7F9'
const S = 1024

/** Közös keret: háttér + tartalom. */
const svg = (background, content) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
  ${background}
  ${content}
</svg>`

const flat = `<rect width="${S}" height="${S}" fill="${INK}"/>`

const gradient = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1B4040"/>
      <stop offset="1" stop-color="#0E2424"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#g)"/>`

// ---------------------------------------------------------------------------
//  A) Pulzus-V – a V betű EGYBEN szívverés-görbe.
//     A márka kezdőbetűje és a jelentése (kardiológia, longevity) egy formában.
// ---------------------------------------------------------------------------
const pulseV = svg(
  gradient,
  `<path d="M 150 400 L 330 400 L 400 300 L 512 720 L 624 300 L 694 400 L 874 400"
      fill="none" stroke="${CREAM}" stroke-width="74"
      stroke-linecap="round" stroke-linejoin="round"/>`,
)

// ---------------------------------------------------------------------------
//  B) V40 monogram – a weboldal betűiből, letisztult arányokkal.
//     A legkonzervatívabb: azonnal összeköthető a névvel.
// ---------------------------------------------------------------------------
const monogram = svg(
  flat,
  `<text x="512" y="512" text-anchor="middle" dominant-baseline="central"
      font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
      font-size="400" font-weight="500" letter-spacing="-8" fill="${CREAM}">V40</text>`,
)

// ---------------------------------------------------------------------------
//  C) V + pulzus alátámasztás – a betű marad a főszereplő, a görbe aláhúzza.
// ---------------------------------------------------------------------------
const vWithPulse = svg(
  gradient,
  `<path d="M 300 270 L 512 640 L 724 270" fill="none" stroke="${CREAM}"
      stroke-width="86" stroke-linecap="round" stroke-linejoin="round"/>
   <path d="M 250 790 L 400 790 L 450 720 L 530 860 L 590 790 L 774 790"
      fill="none" stroke="${MINT}" stroke-width="40"
      stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>`,
)

// ---------------------------------------------------------------------------
//  D) Nyitott gyűrű + V – a gyűrű a folyamatosságot (longevity) idézi, a
//     nyitás a növekedést. A V a márka betűje.
// ---------------------------------------------------------------------------
const ringV = svg(
  flat,
  `<circle cx="512" cy="512" r="330" fill="none" stroke="${MINT}" stroke-width="56"
      stroke-linecap="round" stroke-dasharray="1660 2073" transform="rotate(-62 512 512)"
      opacity="0.9"/>
   <path d="M 372 400 L 512 640 L 652 400" fill="none" stroke="${CREAM}"
      stroke-width="82" stroke-linecap="round" stroke-linejoin="round"/>`,
)

const CONCEPTS = [
  { key: 'a-pulzus-v', label: 'A) Pulzus-V', svg: pulseV },
  { key: 'b-monogram', label: 'B) V40 monogram', svg: monogram },
  { key: 'c-v-pulzus', label: 'C) V + pulzus', svg: vWithPulse },
  { key: 'd-gyuru-v', label: 'D) Gyűrű + V', svg: ringV },
]

const OUT = '/tmp/icon-concepts'
await mkdir(OUT, { recursive: true })

/** Lekerekített sarkok, ahogy az iOS megjeleníti – így látszik a valódi hatás. */
async function rounded(buffer, size) {
  const r = Math.round(size * 0.2237) // az iOS „squircle" közelítése
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/>
     </svg>`,
  )
  return sharp(buffer)
    .resize(size, size)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

// --- Összehasonlító lap: minden koncepció több méretben ---------------------

const SIZES = [180, 120, 76, 48]
const GAP = 28
const LABEL_W = 30
const ROW_H = 180 + GAP

const rows = []
for (const c of CONCEPTS) {
  const full = await sharp(Buffer.from(c.svg)).png().toBuffer()
  await sharp(full).toFile(`${OUT}/${c.key}.png`)

  const cells = []
  let x = LABEL_W
  for (const size of SIZES) {
    cells.push({ input: await rounded(full, size), left: x, top: Math.round((ROW_H - size) / 2) })
    x += size + GAP
  }
  rows.push({ label: c.label, cells, width: x })
}

const SHEET_W = Math.max(...rows.map((r) => r.width)) + 20
const SHEET_H = ROW_H * rows.length + 40

const composites = []
rows.forEach((row, i) => {
  for (const cell of row.cells) {
    composites.push({ ...cell, top: cell.top + i * ROW_H + 20 })
  }
})

// A feliratokat külön SVG-rétegként tesszük rá.
const labels = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="${SHEET_H}">
  ${rows
    .map(
      (r, i) =>
        `<text x="10" y="${i * ROW_H + 20 + ROW_H / 2}" font-family="Helvetica" font-size="15"
           fill="#333" transform="rotate(-90 10 ${i * ROW_H + 20 + ROW_H / 2})"
           text-anchor="middle">${r.label}</text>`,
    )
    .join('')}
</svg>`

await sharp({
  create: { width: SHEET_W, height: SHEET_H, channels: 4, background: '#EDEDED' },
})
  .composite([...composites, { input: Buffer.from(labels), left: 0, top: 0 }])
  .toFile(`${OUT}/osszehasonlitas.png`)

console.log(`Koncepciók: ${OUT}`)
console.log(`Összehasonlítás: ${OUT}/osszehasonlitas.png`)
