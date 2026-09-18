import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

/**
 * App-ikon koncepciók, 2. kör – a VALÓDI logó betűformáival.
 *
 * Az első kör tanulsága: a Helvetica-s felirat idegen a márkától, a túl vékony
 * vonalak pedig 48 képponton eltűnnek. Itt a `public/logo2.png` betűit vágjuk
 * ki, tehát a betűforma pontosan a weboldalé.
 */

const INK = { r: 0x15, g: 0x31, b: 0x31 }
const CREAM = { r: 0xf4, g: 0xf4, b: 0xf0 }
const MINT = { r: 0xe5, g: 0xf7, b: 0xf9 }
const S = 1024

/** A logó mért kivágásai (lásd scripts/make-app-icons.mjs). */
const CROP_V40 = { left: 34, top: 322, width: 340, height: 139 }
const CROP_V = { left: 34, top: 322, width: 117, height: 139 }

/**
 * A kivágott felirat adott színnel, átlátszó háttéren.
 *
 * A logó fekete betű fehér alapon: szürkeárnyalatossá alakítva és megfordítva
 * a betűkből lesz átlátszatlan. A színt képpontonként rajzoljuk ki, a maszk
 * értékét alfaként használva.
 */
async function letters(crop, width, color = CREAM) {
  const { data: mask, info } = await sharp('public/logo2.png')
    .extract(crop)
    .greyscale()
    .negate()
    .resize({ width, fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const rgba = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < info.width * info.height; i++) {
    rgba[i * 4] = color.r
    rgba[i * 4 + 1] = color.g
    rgba[i * 4 + 2] = color.b
    rgba[i * 4 + 3] = mask[i]
  }

  return {
    png: await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toBuffer(),
    width: info.width,
    height: info.height,
  }
}

const bgFlat = async () =>
  sharp({ create: { width: S, height: S, channels: 4, background: { ...INK, alpha: 1 } } })
    .png()
    .toBuffer()

const bgGradient = async () =>
  sharp(
    Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="#1D4444"/><stop offset="1" stop-color="#0D2121"/>
      </linearGradient></defs>
      <rect width="${S}" height="${S}" fill="url(#g)"/>
    </svg>`),
  )
    .png()
    .toBuffer()

/** Réteg középre igazítva, opcionális függőleges eltolással. */
const center = (layer, dy = 0) => ({
  input: layer.png,
  left: Math.round((S - layer.width) / 2),
  top: Math.round((S - layer.height) / 2 + dy),
})

const overlay = (svgString) => ({ input: Buffer.from(svgString), left: 0, top: 0 })

const concepts = []

// --- E) Valódi V40, tömör háttéren ------------------------------------------
concepts.push({
  key: 'e-brand-v40',
  label: 'E) Valódi V40',
  build: async () =>
    sharp(await bgFlat())
      .composite([center(await letters(CROP_V40, Math.round(S * 0.6)))])
      .png()
      .toBuffer(),
})

// --- F) Nagy V, a márka betűjével -------------------------------------------
concepts.push({
  key: 'f-brand-v',
  label: 'F) Nagy V',
  build: async () =>
    sharp(await bgGradient())
      .composite([center(await letters(CROP_V, Math.round(S * 0.42)))])
      .png()
      .toBuffer(),
})

// --- G) V40 + pulzus alatta --------------------------------------------------
//     A felirat marad a főszereplő; a görbe vastag, hogy kicsiben se vesszen el.
concepts.push({
  key: 'g-v40-pulzus',
  label: 'G) V40 + pulzus',
  build: async () =>
    sharp(await bgGradient())
      .composite([
        center(await letters(CROP_V40, Math.round(S * 0.56)), -70),
        overlay(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
            <path d="M 250 730 L 400 730 L 452 655 L 530 815 L 585 730 L 774 730"
              fill="none" stroke="rgb(229,247,249)" stroke-width="46"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`),
      ])
      .png()
      .toBuffer(),
})

// --- H) Ív + nagy V ----------------------------------------------------------
//     Az ív a folytonosságot idézi; vastag vonal, hogy kicsiben is megálljon.
concepts.push({
  key: 'h-iv-v',
  label: 'H) Ív + V',
  build: async () =>
    sharp(await bgFlat())
      .composite([
        overlay(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
            <circle cx="512" cy="512" r="352" fill="none" stroke="rgb(229,247,249)"
              stroke-width="64" stroke-linecap="round"
              stroke-dasharray="1770 2211" transform="rotate(-58 512 512)"/>
          </svg>`),
        center(await letters(CROP_V, Math.round(S * 0.3))),
      ])
      .png()
      .toBuffer(),
})

// --- I) Kétszínű V40: a "V" mentazöld, a "40" krém --------------------------
concepts.push({
  key: 'i-ketszinu',
  label: 'I) Kétszínű V40',
  build: async () => {
    const all = await letters(CROP_V40, Math.round(S * 0.6), CREAM)
    const justV = await letters(CROP_V, Math.round(S * 0.6 * (117 / 340)), MINT)
    const left = Math.round((S - all.width) / 2)
    const top = Math.round((S - all.height) / 2)
    return sharp(await bgFlat())
      .composite([
        { input: all.png, left, top },
        { input: justV.png, left, top },
      ])
      .png()
      .toBuffer()
  },
})

const OUT = '/tmp/icon-concepts-2'
await mkdir(OUT, { recursive: true })

async function rounded(buffer, size) {
  const r = Math.round(size * 0.2237)
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`,
  )
  return sharp(buffer)
    .resize(size, size)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

const SIZES = [180, 120, 76, 48]
const GAP = 28
const LABEL_W = 34
const ROW_H = 180 + GAP

const rows = []
for (const c of concepts) {
  const full = await c.build()
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
  for (const cell of row.cells) composites.push({ ...cell, top: cell.top + i * ROW_H + 20 })
})

const labels = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_W}" height="${SHEET_H}">
  ${rows
    .map((r, i) => {
      const cy = i * ROW_H + 20 + ROW_H / 2
      return `<text x="12" y="${cy}" font-family="Helvetica" font-size="15" fill="#333"
                transform="rotate(-90 12 ${cy})" text-anchor="middle">${r.label}</text>`
    })
    .join('')}
</svg>`

await sharp({ create: { width: SHEET_W, height: SHEET_H, channels: 4, background: '#EDEDED' } })
  .composite([...composites, { input: Buffer.from(labels), left: 0, top: 0 }])
  .toFile(`${OUT}/osszehasonlitas.png`)

console.log(`${OUT}/osszehasonlitas.png`)
