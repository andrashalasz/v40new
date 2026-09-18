import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Az alkalmazás ikonkészletének előállítása a WEBOLDAL logójából.
 *
 * Miért monogram és nem a teljes logó: a `public/logo2.png` egy széles felirat
 * ("V40Vital Longevity"). Négyzetes app-ikonná zsugorítva a betűk 60x60
 * képponton olvashatatlanná válnának. A kezdőhomokban ezért a "V40" rész
 * szerepel – UGYANAZOKKAL a betűformákkal, tehát nem új arculat, hanem a
 * meglévő logó kivágása.
 *
 * A fekete feliratot maszkként használjuk, és a márka krém színével rajzoljuk
 * újra a sötétzöld háttéren – így az ikon a sötét és világos kezdőképernyőn is
 * kontrasztos.
 *
 * Futtatás:  node scripts/make-app-icons.mjs
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT = join(ROOT, 'mobile', 'assets')

/** A logó "V40" részének pontos helye a public/logo2.png-ben (mérve). */
const CROP = { left: 34, top: 322, width: 340, height: 139 }

/** Márkaszínek – azonosak a weboldaléval (app/src/theme.ts). */
const INK = { r: 0x15, g: 0x31, b: 0x31 } // #153131 sötétzöld
const CREAM = { r: 0xf4, g: 0xf4, b: 0xf0 } // #F4F4F0 krém

const SIZE = 1024

/**
 * A kivágott felirat alfa-maszkja.
 *
 * A logó fekete betű fehér alapon. Szürkeárnyalatossá alakítva és megfordítva
 * a betűkből lesz "átlátszatlan", a háttérből "átlátszó" – pont egy maszk.
 * A `logoWidth` a végleges ikonon belüli szélesség.
 */
async function letterMask(logoWidth) {
  return sharp(join(ROOT, 'public', 'logo2.png'))
    .extract(CROP)
    .greyscale()
    .negate()
    .resize({ width: logoWidth, fit: 'inside' })
    // Nyers képpontok kellenek, nem PNG: a maszkot a `composite` raw
    // bemenetként kapja meg, kódolt formátumnál a méret nem stimmelne.
    .raw()
    .toBuffer({ resolveWithObject: true })
}

/**
 * Egyszínű felirat átlátszó háttéren.
 *
 * A színt képpontonként RAJZOLJUK ki, a maszk értékét alfaként használva.
 * Egycsatornás maszkot `blend: 'dest-in'`-nel átadni nem működne: annak a
 * műveletnek a forrás ALFÁJA számít, egy szürkeárnyalatos képnek viszont
 * nincs alfája, így mindenhol átlátszatlannak látszana – tömör téglalapot
 * kapnánk a betűk helyett.
 */
async function wordmark(logoWidth, color) {
  const { data: mask, info } = await letterMask(logoWidth)
  const { width, height } = info

  const rgba = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = color.r
    rgba[i * 4 + 1] = color.g
    rgba[i * 4 + 2] = color.b
    rgba[i * 4 + 3] = mask[i] // a betűk fehérek a negált maszkon -> átlátszatlanok
  }

  return {
    data: await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer(),
    info: { width, height },
  }
}

const creamWordmark = (logoWidth) => wordmark(logoWidth, CREAM)

/** Ikon: sötétzöld négyzet, közepén a krém "V40". */
async function icon(logoRatio, background) {
  const logoWidth = Math.round(SIZE * logoRatio)
  const { data: wordmark, info } = await creamWordmark(logoWidth)

  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background },
  })
    .composite([
      {
        input: wordmark,
        left: Math.round((SIZE - info.width) / 2),
        top: Math.round((SIZE - info.height) / 2),
      },
    ])
    .png()
    .toBuffer()
}

/** Egyszínű négyzet. */
function solid(color) {
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: color } })
    .png()
    .toBuffer()
}

/** Fehér felirat átlátszó háttéren – az Android monokróm (téma) ikonjához. */
async function monochrome(logoRatio) {
  const { data: white, info } = await wordmark(
    Math.round(SIZE * logoRatio),
    { r: 255, g: 255, b: 255 },
  )

  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: white, left: Math.round((SIZE - info.width) / 2), top: Math.round((SIZE - info.height) / 2) }])
    .png()
    .toBuffer()
}

await mkdir(OUT, { recursive: true })

const opaque = { ...INK, alpha: 1 }
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

const files = {
  // iOS és általános app-ikon. A felirat a szélesség 62%-a: marad levegő,
  // és a lekerekített sarkok nem vágnak bele.
  'icon.png': await icon(0.62, opaque),

  // Android adaptív ikon: a rendszer a képet levághatja körre vagy
  // négyzetre, és a külső ~33% bármikor eltűnhet. Ezért a felirat kisebb,
  // hogy biztosan a biztonságos zónában maradjon.
  'android-icon-foreground.png': await icon(0.44, transparent),
  'android-icon-background.png': await solid(opaque),
  'android-icon-monochrome.png': await monochrome(0.44),

  // Indítókép: átlátszó háttéren a felirat, a háttérszínt az app.json adja.
  'splash-icon.png': await icon(0.55, transparent),

  // Kedvenc ikon a fejlesztői webes nézethez.
  'favicon.png': await sharp(await icon(0.62, opaque)).resize(48).png().toBuffer(),
}

for (const [name, buffer] of Object.entries(files)) {
  await sharp(buffer).toFile(join(OUT, name))
  console.log(`✓ mobile/assets/${name}`)
}

console.log('\nAz ikonok a public/logo2.png "V40" részéből készültek.')
