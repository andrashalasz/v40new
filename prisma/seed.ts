import { PrismaClient } from "@prisma/client";

import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const adminEmail = "admin@admin.com";
    const adminPassword = "AdminPassword123!"; // Ezt élesben meg kell majd változtatni!

    // Ellenőrizzük, hogy létezik-e már ez a felhasználó
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });

    if (existingAdmin) {
        console.log(`Az admin felhasználó (${adminEmail}) már létezik.`);

        return;
    }
    // Jelszó titkosítása
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    // Admin létrehozása

    const admin = await prisma.user.create({
        data: {
            email: adminEmail,
            password: hashedPassword,
            role: "ADMIN",
        },
    });
}

main()
  .catch((e) => {
    console.error(e);

    process.exit(1);
  })

  .finally(async () => {
    await prisma.$disconnect();
  });
