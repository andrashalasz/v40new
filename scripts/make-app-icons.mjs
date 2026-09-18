import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Az alkalmazás ikonkészletének előállítása a WEBOLDAL logójából.
 *
 * A jel: a "V40" felirat a márka saját betűivel, alatta egy pulzusvonal. A
 * felirat azonosítja a márkát, a görbe elmondja, miről szól az app – ettől
 * nem néz ki bármelyik üzleti alkalmazásnak.
 *
 * Miért nem a teljes logó: a `public/logo2.png` egy széles felirat
 * ("V40Vital Longevity"). Négyzetes app-ikonná zsugorítva a betűk 48
 * képponton olvashatatlanná válnának. Ezért csak a "V40" rész szerepel –
 * UGYANAZOKKAL a betűformákkal, tehát nem új arculat, hanem a meglévő logó
 * kivágása.
 *
 * Amire a méretezésnél figyelünk:
 *   - 48 képponton is felismerhető (ekkora a Beállítások listájában),
 *   - vastag vonalak: a vékony vonal kicsiben eltűnik vagy elmosódik,
 *   - az Android adaptív ikonnál a külső ~33% bármikor levágható, ezért ott
 *     minden kisebb és beljebb van.
 *
 * Futtatás:  node scripts/make-app-icons.mjs
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT = join(ROOT, 'mobile', 'assets')

/** A logó "V40" részének pontos helye a public/logo2.png-ben (mérve). */
const CROP = { left: 34, top: 322, width: 340, height: 139 }

/** Márkaszínek – azonosak a weboldaléval (mobile/src/theme.ts). */
const INK = { r: 0x15, g: 0x31, b: 0x31 } // #153131 sötétzöld
const CREAM = { r: 0xf4, g: 0xf4, b: 0xf0 } // #F4F4F0 krém
const MINT = 'rgb(229,247,249)' // #E5F7F9

const S = 1024

/**
 * A kivágott felirat adott színnel, átlátszó háttéren.
 *
 * A logó fekete betű fehér alapon. Szürkeárnyalatossá alakítva és megfordítva
 * a betűkből lesz "átlátszatlan", a háttérből "átlátszó". A színt
 * KÉPPONTONKÉNT rajzoljuk ki, a maszk értékét alfaként használva: egycsatornás
 * maszkot `blend: 'dest-in'`-nel átadni nem működne, mert annak a műveletnek a
 * forrás ALFÁJA számít, egy szürkeárnyalatos képnek viszont nincs alfája –
 * tömör téglalapot kapnánk a betűk helyett.
 */
async function wordmark(width, color = CREAM) {
  const { data: mask, info } = await sharp(join(ROOT, 'public', 'logo2.png'))
    .extract(CROP)
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
    rgba[i * 4 + 3] = mask[i] // a betűk fehérek a negált maszkon -> átlátszatlanok
  }

  return {
    png: await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toBuffer(),
    width: info.width,
    height: info.height,
  }
}

const gradientBg = () =>
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

const solidBg = (color) =>
  sharp({ create: { width: S, height: S, channels: 4, background: color } })
    .png()
    .toBuffer()

const transparentBg = () => solidBg({ r: 0, g: 0, b: 0, alpha: 0 })

/**
 * A pulzusvonal SVG-ként.
 *
 * A `scale` az egész jelet kicsinyíti a középpont körül – az Android adaptív
 * ikonhoz kell, ahol a széleket levághatják. A vonalvastagság is vele skálázik,
 * különben kicsiben aránytalanul vastag maradna.
 */
const pulse = (scale = 1, dy = 0, color = MINT) => {
  const w = Math.round(46 * scale)
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
      <g transform="translate(512 ${512 + dy}) scale(${scale}) translate(-512 -512)">
        <path d="M 250 730 L 400 730 L 452 655 L 530 815 L 585 730 L 774 730"
          fill="none" stroke="${color}" stroke-width="${w}"
          stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>`)
}

/** A teljes jel: felirat + pulzus, a megadott háttéren. */
async function mark({ background, textScale, glyphColor, pulseColor, offsetY = -70, scale = 1 }) {
  const letters = await wordmark(Math.round(S * textScale), glyphColor)

  return sharp(background)
    .composite([
      {
        input: letters.png,
        left: Math.round((S - letters.width) / 2),
        top: Math.round((S - letters.height) / 2 + offsetY * scale),
      },
      { input: pulse(scale, 0, pulseColor), left: 0, top: 0 },
    ])
    .png()
    .toBuffer()
}

await mkdir(OUT, { recursive: true })

// --- iOS és általános app-ikon ----------------------------------------------
const icon = await mark({
  background: await gradientBg(),
  textScale: 0.56,
})

// --- Android adaptív ikon ---------------------------------------------------
// A rendszer körre vagy négyzetre is vághatja, és a külső harmad eltűnhet:
// ezért a jel 0.66-szoros, hogy biztosan a biztonságos zónában maradjon.
const androidForeground = await mark({
  background: await transparentBg(),
  textScale: 0.56 * 0.66,
  scale: 0.66,
})

// A monokróm (téma) ikon egyetlen színnel dolgozik: a rendszer színezi át.
const androidMonochrome = await mark({
  background: await transparentBg(),
  textScale: 0.56 * 0.66,
  scale: 0.66,
  glyphColor: { r: 255, g: 255, b: 255 },
  pulseColor: 'rgb(255,255,255)',
})

const files = {
  // Az App Store ikon NEM tartalmazhat alfa-csatornát: az Apple ITMS-90717
  // hibával utasítja vissza ("Invalid App Store Icon"), és a feltöltés után
  // az App Store Connectben üresen marad az ikon helye.
  //
  // A `flatten` a (teljesen átlátszatlan) képet háromcsatornássá alakítja. A
  // háttérszín csak biztonsági tartalék: a jel amúgy is kitölti a teljes
  // négyzetet, tehát látható különbség nincs.
  //
  // FONTOS: ez CSAK erre a fájlra vonatkozik. Az Android adaptív rétegeknek
  // és az indítóképnek KELL az átlátszóság, különben tömör négyzetként
  // jelennének meg.
  'icon.png': await sharp(icon).flatten({ background: INK }).png().toBuffer(),
  'android-icon-foreground.png': androidForeground,
  'android-icon-background.png': await solidBg({ ...INK, alpha: 1 }),
  'android-icon-monochrome.png': androidMonochrome,

  // Indítókép: átlátszó háttéren a jel, a hátteret az app.json adja.
  'splash-icon.png': await mark({ background: await transparentBg(), textScale: 0.5, scale: 0.9 }),

  'favicon.png': await sharp(icon).resize(48).png().toBuffer(),
}

for (const [name, buffer] of Object.entries(files)) {
  await sharp(buffer).toFile(join(OUT, name))
  console.log(`✓ mobile/assets/${name}`)
}

console.log('\nAz ikonok a public/logo2.png "V40" részéből készültek.')
