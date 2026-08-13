import { PrismaClient } from '@prisma/client'

// Fejlesztés közben a Nuxt HMR újratölti a modulokat. Globális gyorsítótár
// nélkül minden újratöltés új kapcsolatkészletet nyitna, és a MySQL pár perc
// alatt elérné a max_connections limitet.
const g = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  g.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') g.prisma = prisma
