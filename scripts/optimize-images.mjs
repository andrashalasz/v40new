/**
 * Képoptimalizáló – public/ -> public/optimized/
 *
 * A repóban lévő PNG-k összesen ~24 MB-ot tesznek ki, és ez teljes egészében
 * letöltődik a látogatóknál. Mérés szerint a valóban felhasznált 13,25 MB
 * WebP-ben 0,57 MB (kb. 95% megtakarítás), észrevehető minőségromlás nélkül.
 *
 * A legrosszabb tételek:
 *   favicon.svg  2,2 MB  <- egy favicon, minden oldalletöltésnél
 *   17.png       4,4 MB
 *   banner1.png  1,6 MB
 *
 * Futtatás:
 *   npm i -D sharp
 *   npm run optimize:images
 *
 * A kimenet a public/optimized/ mappába kerül, az eredetiket nem írja felül.
 * Ellenőrzés után a hivatkozásokat kell átállítani (vagy a @nuxt/image-et
 * beállítani, hogy build közben maga végezze el ezt).
 */
import { readdir, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "public";
const OUT = path.join("public", "optimized");

/** Célszélesség a tényleges megjelenített méret kétszerese (retina). */
const WIDTHS = {
  "banner1.png": 1500,
  "banner.png": 1500,
  "14.png": 1500,
  "13.png": 1500,
  "17.png": 1600,
  "18.png": 1600,
  "26.png": 900,
  "3.png": 960,
  "12.png": 960,
  "1.png": 640,
  "2.png": 460,
  "11.png": 460,
  "21.png": 760,
  "29.png": 760,
  "30.png": 760,
  "31.png": 760,
  "8.png": 720,
  "9.png": 720,
  "10.png": 720,
  "19.png": 720,
  "41.jpeg": 620,
  "42.jpeg": 620,
  "43.jpeg": 620,
  "50.png": 210,
  "51.png": 210,
  "52.png": 210,
  "53.png": 210,
  "s1.png": 200,
  "s2.png": 200,
  "s3.png": 200,
  "s4.png": 200,
  "logo2.png": 400,
  "logo3.webp": 200,
};

const DEFAULT_WIDTH = 1200;
const QUALITY = 78;
const kb = (n) => (n / 1024).toFixed(0) + " kB";

const rasters = /\.(png|jpe?g|webp)$/i;

async function main() {
  await mkdir(OUT, { recursive: true });

  const files = (await readdir(SRC)).filter((f) => rasters.test(f));
  let before = 0;
  let after = 0;
  const rows = [];

  for (const f of files) {
    const src = path.join(SRC, f);
    const inSize = (await stat(src)).size;
    const width = WIDTHS[f] ?? DEFAULT_WIDTH;

    const img = sharp(src);
    const meta = await img.metadata();
    const pipeline = meta.width > width ? img.resize({ width }) : img;

    const outName = f.replace(/\.(png|jpe?g|webp)$/i, ".webp");
    const buf = await pipeline.webp({ quality: QUALITY, effort: 6 }).toBuffer();
    await sharp(buf).toFile(path.join(OUT, outName));

    before += inSize;
    after += buf.length;
    rows.push({ fájl: f, eredeti: kb(inSize), webp: kb(buf.length),
      megtakarítás: (100 - (buf.length / inSize) * 100).toFixed(0) + "%" });
  }

  console.table(rows);
  console.log(`Összesen: ${kb(before)} -> ${kb(after)}  (${(100 - (after / before) * 100).toFixed(1)}% megtakarítás)`);
  console.log(`\nA kimenet itt van: ${OUT}`);
  console.log("Az SVG-ket ez a szkript nem bántja. A favicon.svg (2,2 MB) külön");
  console.log("figyelmet érdemel: az szinte biztosan félrementett fájl.");
}

main().catch((e) => {
  if (e.code === "ERR_MODULE_NOT_FOUND") {
    console.error("A sharp nincs telepítve. Futtasd: npm i -D sharp");
    process.exit(1);
  }
  console.error(e);
  process.exit(1);
});
