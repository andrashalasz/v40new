import { prisma } from '~~/server/utils/prisma'
import { H3Event } from "h3";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const saveAsWebp = async (file: any) => {
  const uploadDir = path.join(process.cwd(), "public/uploads/doctors");
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const filePath = path.join(uploadDir, fileName);

  await sharp(file.data)
    .resize(800, 800, { fit: 'cover', withoutEnlargement: true }) // Orvosoknak jó a négyzetes vágás
    .webp({ quality: 80 })
    .toFile(filePath);

  // Relativ URL: igy dev/staging/eles kornyezetben is helyes
  return `/uploads/doctors/${fileName}`;
};

const deletePhysicalFile = async (url: string | null) => {
  if (!url) return;
  try {
    const relativePath = url.replace(/^https?:\/\/[^\/]+/, "");
    const absolutePath = path.join(process.cwd(), "public", relativePath);
    await fs.unlink(absolutePath);
  } catch (err) { console.error("Fájl törlési hiba:", err); }
};

export default defineEventHandler(async (event: H3Event) => {
  const method = event.method;

  // --- GET: Listázás / Egyedi ---
  if (method === 'GET') {
    const query = getQuery(event);
    if (query.id) return await prisma.doctor.findUnique({ where: { id: Number(query.id) } });
    return await prisma.doctor.findMany({ orderBy: { name: 'asc' } });
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

    let picUrl = null;
    if (file) picUrl = await saveAsWebp(file);

    const doctor = await prisma.doctor.create({
      data: {
        name: getField("name") || "",
        category: getField("categ") || "",
        desc: getField("desc") || "",
        picUrl: picUrl
      }
    });
    return { success: true, doctor };
  }

  // --- PUT: SZERKESZTÉS ---
  if (method === 'PUT') {
    const formData = await readMultipartFormData(event);
    if (!formData) throw createError({ statusCode: 400 });

    const getField = (name: string) => formData.find(f => f.name === name)?.data.toString('utf-8').trim();
    const id = Number(getField("id"));
    const newFile = formData.find(f => f.name === "picUrl");

    const oldDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!oldDoctor) return { error: "Nincs meg az orvos!" };

    let finalPicUrl = oldDoctor.picUrl;
    if (newFile && newFile.data.length > 0) {
      await deletePhysicalFile(oldDoctor.picUrl);
      finalPicUrl = await saveAsWebp(newFile);
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        name: getField("name"),
        category: getField("categ"),
        desc: getField("desc"),
        picUrl: finalPicUrl
      }
    });
    return { success: true, doctor };
  }

  // --- DELETE: TÖRLÉS ---
  if (method === 'DELETE') {
    const body = await readBody(event);
    const doctor = await prisma.doctor.findUnique({ where: { id: Number(body.id) } });
    if (doctor) {
      await deletePhysicalFile(doctor.picUrl);
      await prisma.doctor.delete({ where: { id: doctor.id } });
    }
    return { success: true };
  }
});