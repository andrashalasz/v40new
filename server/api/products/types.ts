import prisma from "../utils/prisma";

export default defineEventHandler(async (event) => {
  try {
    // Lekérjük az egyedi típusokat, ahol a type nem null
    const types = await prisma.product.findMany({
      where: {
        type: {
          not: null,
        },
      },
      select: {
        type: true,
      },
      distinct: ['type'],
    })

    // Átalakítjuk egy egyszerű string tömbbé: ["típus1", "típus2"]
    return types.map(item => item.type)
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Nem sikerült lekérni a típusokat.',
    })
  }
})