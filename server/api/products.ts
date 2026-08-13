import prisma from "./utils/prisma";
import { H3Event } from "h3";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const slugify = (text: string) => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// Segédfüggvény a kép mentéséhez (ugyanaz, mint a blognál)
const saveAsWebp = async (file: any) => {
  const uploadDir = path.join(process.cwd(), "public/uploads/products");
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `prod-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const filePath = path.join(uploadDir, fileName);

  await sharp(file.data)
    .resize(1000, null, {维护: true, withoutEnlargement: true }) // Termékeknek elég az 1000px
    .webp({ quality: 80 })
    .toFile(filePath);

  return `https://v40vital.hu/uploads/products/${fileName}`;
};

const deletePhysicalFile = async (fullUrl: string | null) => {
  if (!fullUrl) return;

  try {
    // Kicseréljük a teljes URL-t relatív útvonalra
    // pl. "http://localhost:3000/uploads/kep.webp" -> "/uploads/kep.webp"
    const relativePath = fullUrl.replace(/^https?:\/\/[^\/]+/, "");
    
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    
    await fs.unlink(absolutePath);
    console.log("Sikeres törlés:", absolutePath);
  } catch (err) {
    console.error("Fájl törlési hiba (lehet már nem létezik):", err);
  }
};

export default defineEventHandler(async (event: H3Event) => {
  const method = event.method;

  // --- GET ÁG (Változatlan) ---
   if (method === 'GET') {
    const query = getQuery(event)
    
    // 1. Egyedi termék lekérése SLUG alapján
    if (query.slug) {
      const allProducts = await prisma.product.findMany();
      const foundProduct = allProducts.find(p => slugify(p.title) === query.slug);
      
      if (!foundProduct) {
        throw createError({ statusCode: 404, statusMessage: 'A termék nem található' });
      }

      // Hasonló termékek lekérése (ugyanaz a típus, de nem önmaga)
      const relatedProducts = await prisma.product.findMany({
        where: {
          type: foundProduct.type,
          NOT: {
            id: foundProduct.id
          }
        },
        take: 4 // Opcionális: csak az első 4 hasonlót adjuk vissza
      });

      // Visszaadjuk a terméket és a kapcsolódó listát is
      return {
        product: foundProduct,
        related: relatedProducts
      };
    }

    // 2. Egyedi termék lekérése ID alapján (megtartva a régit is)
    if (query.id) {
      return await prisma.product.findUnique({
        where: { id: Number(query.id) }
      })
    }

    // --- SZŰRÉS (Típus alapján) ---
    const whereClause: any = {}
    if (query.type && query.type !== 'Minden') {
      whereClause.type = String(query.type)
    }

    return await prisma.product.findMany({
      where: whereClause,
      orderBy: { id: 'desc' }
    })
  }

  // Admin Check
  const session = await getUserSession(event);
  if (!session || session.user.role !== "ADMIN") throw createError({ statusCode: 401 });

  // --- POST: LÉTREHOZÁS ---
  if (method === 'POST') {
    const formData = await readMultipartFormData(event);
    if (!formData) throw createError({ statusCode: 400 });

    const getField = (name: string) => formData.find(f => f.name === name)?.data.toString('utf-8').trim();
    const file = formData.find(f => f.name === "picUrl");

    if (!file) return { error: "Kép kötelező!" };

    const picUrl = await saveAsWebp(file);
    const product = await prisma.product.create({
      data: {
        title: getField("title") || "",
        desc: getField("desc") || "",
        type: getField("type") || "",
        price: Number(getField("price")) || "",
        time: getField("time") || "",
        picUrl: picUrl,
        gender: getField("gender") || "",
      }
    });
    return { success: true, product };
  }

  // --- PUT: SZERKESZTÉS ---
  if (method === 'PUT') {
    const formData = await readMultipartFormData(event);
    if (!formData) throw createError({ statusCode: 400 });

    const getField = (name: string) => formData.find(f => f.name === name)?.data.toString('utf-8').trim();
    const id = Number(getField("id"));
    const newFile = formData.find(f => f.name === "picUrl");

    const oldProduct = await prisma.product.findUnique({ where: { id } });
    if (!oldProduct) return { error: "Nincs meg a termék!" };

    let finalPicUrl = oldProduct.picUrl;
    if (newFile && newFile.data.length > 0) {
      await deletePhysicalFile(oldProduct.picUrl);
      finalPicUrl = await saveAsWebp(newFile);
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        title: getField("title"),
        desc: getField("desc"),
        type: getField("type"),
        price: Number(getField("price")),
        time: getField("time"),
        picUrl: finalPicUrl,
        gender: getField("gender") || "",
      }
    });
    return { success: true, product };
  }

  // --- DELETE: TÖRLÉS ---
  if (method === 'DELETE') {
    const body = await readBody(event);
    const product = await prisma.product.findUnique({ where: { id: Number(body.id) } });
    if (product) {
      await deletePhysicalFile(product.picUrl);
      await prisma.product.delete({ where: { id: product.id } });
    }
    return { success: true };
  }
});