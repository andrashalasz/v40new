import prisma from "./utils/prisma";
import { H3Event } from "h3";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Segédfüggvény a SEO-barát slughoz
const generateSlug = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// Segédfüggvény a kép mentéséhez és konvertálásához
const saveAsWebp = async (file: any) => {
  const uploadDir = path.join(process.cwd(), "public/uploads/blogs");
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const filePath = path.join(uploadDir, fileName);

  await sharp(file.data)
    .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath);

  // Relativ URL: igy dev/staging/eles kornyezetben is helyes
  return `/uploads/blogs/${fileName}`;
};

// Segédfüggvény a fájl törléséhez a tárhelyről
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

  // --- GET: Listázás vagy Egyedi lekérés ---
  if (method === 'GET') {
    const query = getQuery(event);
    if (query.id) {
      return await prisma.blog.findUnique({ where: { id: Number(query.id) } });
    }
    if (query.slug) {
      return await prisma.blog.findUnique({ where: { slug: String(query.slug) } });
    }
    return await prisma.blog.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // --- Admin jogosultság ellenőrzése a módosító műveletekhez ---
  const session = await getUserSession(event);
  if (!session || session.user.role !== "ADMIN") {
    throw createError({ statusCode: 401, message: "Nincs jogosultságod!" });
  }

  // --- POST: Új blog létrehozása ---
  if (method === 'POST') {
    const formData = await readMultipartFormData(event);
    if (!formData) throw createError({ statusCode: 400, message: "Nincs adat!" });

    const getField = (name: string) => formData.find(f => f.name === name)?.data.toString('utf-8').trim();
    const title = getField("title");
    const lead = getField("lead");
    const rows = getField("rows");
    const file = formData.find(f => f.name === "picUrl");

    if (!title || !file) return { error: "Cím és kép kötelező!" };

    const picUrl = await saveAsWebp(file);
    const blog = await prisma.blog.create({
      data: {
        title,
        slug: generateSlug(title),
        lead: lead || "",
        rows: rows || "",
        picUrl,
      }
    });
    return { success: true, blog };
  }

  // --- PUT: Blog szerkesztése ---
  if (method === 'PUT') {
    const formData = await readMultipartFormData(event);
    if (!formData) throw createError({ statusCode: 400, message: "Nincs adat!" });

    const getField = (name: string) => formData.find(f => f.name === name)?.data.toString('utf-8').trim();
    const id = Number(getField("id"));
    const title = getField("title");
    const lead = getField("lead");
    const rows = getField("rows");
    const newFile = formData.find(f => f.name === "picUrl");

    if (!id || !title) return { error: "ID és Cím kötelező!" };

    const oldBlog = await prisma.blog.findUnique({ where: { id } });
    if (!oldBlog) return { error: "Blog nem található!" };

    let finalPicUrl = oldBlog.picUrl;

    // Ha jött új kép, töröljük a régit és mentjük az újat
    if (newFile && newFile.data.length > 0) {
      await deletePhysicalFile(oldBlog.picUrl);
      finalPicUrl = await saveAsWebp(newFile);
    }

    const blog = await prisma.blog.update({
      where: { id },
      data: {
        title,
        slug: generateSlug(title),
        lead,
        rows,
        picUrl: finalPicUrl,
        updatedAt: new Date()
      }
    });
    return { success: true, blog };
  }

  // --- DELETE: Blog törlése ---
  if (method === 'DELETE') {
    const body = await readBody(event);
    if (!body.id) return { error: "ID hiányzik!" };

    const blog = await prisma.blog.findUnique({ where: { id: Number(body.id) } });
    if (blog) {
      await deletePhysicalFile(blog.picUrl);
      await prisma.blog.delete({ where: { id: blog.id } });
    }
    return { success: true };
  }
});