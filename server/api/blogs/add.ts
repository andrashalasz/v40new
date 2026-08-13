import prisma from "../utils/prisma";
import { H3Event } from "h3";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp"; 

export default defineEventHandler(async (event: H3Event) => {
  // 1. Jogosultság ellenőrzése
  const session = await getUserSession(event);
  if (!session || session.user.role !== "ADMIN") {
    throw createError({ statusCode: 401, message: "Nem vagy admin!" });
  }

  // 2. Multipart adatok beolvasása (Form-data)
  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({ statusCode: 400, message: "Nincs küldött adat!" });
  }

  // 3. Segédfüggvények a mezők kinyeréséhez (Buffer -> String konverzió)
  const getField = (name: string): string => {
    const field = formData.find(f => f.name === name);
    // UTF-8 kódolással alakítjuk stringgé és levágjuk a felesleges szóközöket
    return field ? field.data.toString('utf-8').trim() : "";
  };

  const getFile = (name: string) => formData.find(f => f.name === name);

  const title = getField("title");
  const lead = getField("lead");
  const rows = getField("rows");
  const cardFile = getFile("picUrl");

  // 4. Validáció: Ha bármi hiányzik, hibaüzenetet küldünk
  if (!title || !lead || !rows || !cardFile) {
    return { 
      error: `Hiányzó adatok! (Cím: ${!!title}, Lead: ${!!lead}, Tartalom: ${!!rows}, Kép: ${!!cardFile})` 
    };
  }

  try {
    // 5. Feltöltési mappa előkészítése
    const uploadDir = path.join(process.cwd(), "public/uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // 6. Képfeldolgozó függvény (WebP + Átméretezés)
    const processAndSaveAsWebp = async (file: any) => {
      // Egyedi fájlnév generálása időbélyeggel
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
      const filePath = path.join(uploadDir, fileName);

      await sharp(file.data)
        .resize(1200, null, { 
          withoutEnlargement: true // Ne nagyítsa fel, ha kisebb mint 1200px
        })
        .webp({ 
          quality: 80, // Kiváló minőség/méret arány
          effort: 4 
        })
        .toFile(filePath);

      return `/uploads/${fileName}`;
    };

    const cardImageUrl = await processAndSaveAsWebp(cardFile);

    // 7. Biztonságos és SEO-barát Slug generálás
    const generateSlug = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD") // Felbontja az ékezetes karaktereket (pl. á -> a + ´)
        .replace(/[\u0300-\u036f]/g, "") // Eltávolítja a "mellékjeleket" (az ékezeteket)
        .trim()
        .replace(/[^\w\s-]/g, "") // Csak betűk, számok, szóköz és kötőjel marad
        .replace(/\s+/g, "-") // Szóközök -> kötőjel
        .replace(/-+/g, "-"); // Dupla kötőjelek kiszűrése

    const slug = generateSlug(title);

    // 8. Mentés az adatbázisba Prisma-val
    const blog = await prisma.blog.create({
      data: {
        title,
        slug,
        lead,
        rows,
        picUrl: cardImageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { 
      success: true, 
      blog 
    };

  } catch (error: any) {
    console.error("Szerver hiba a blog mentésekor:", error);
    return { 
      error: "Hiba történt a feldolgozás során: " + error.message 
    };
  }
});