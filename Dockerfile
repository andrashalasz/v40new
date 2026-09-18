# V40 Vital – önálló Node szerver (Nuxt/Nitro build).
#
# Kétlépcsős build: a fordításhoz kellő eszközök (devDependencies, forrás) nem
# kerülnek bele a futtatott képbe. Enélkül a kép feleslegesen nagy lenne, és a
# fejlesztői csomagok is ott ülnének egy kiszolgálón.

# ---------- 1. Fordítás ----------
FROM node:22-alpine AS build

# A Prisma query engine-nek OpenSSL kell; a libc6-compat a natív modulokhoz.
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# A függőségek külön rétegben: amíg a package.json nem változik, a Docker
# újrahasznosítja ezt a réteget, és a telepítés nem fut le újra.
COPY package*.json ./
COPY prisma ./prisma/

# `npm ci`, NEM `npm install`: pontosan a lockfile szerint telepít, tehát a
# build reprodukálható. A devDependencies KELLENEK: a prisma és a tsx nélkül a
# seed és a tartalom-import nem futtatható.
RUN npm ci

COPY . .

# A Prisma klienst a konténeren belül kell generálni: a query engine binárisa
# platformfüggő, a gazdagépen generált kliens Alpine alatt nem működne.
RUN npx prisma generate && npm run build

# ---------- 2. Futtatás ----------
FROM node:22-alpine AS runtime

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app
ENV NODE_ENV=production

# A Nitro build önálló: a .output mindent tartalmaz, amire a szerver futáshoz
# szüksége van. A node_modules és a prisma azért kell, mert a migrációt és a
# seedet a konténerből futtatjuk (lásd docker-compose parancs).
COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

# A Nitro szerver a PORT változót olvassa. A korábbi Dockerfile 3001-et
# hirdetett az EXPOSE-zal, de nem állította be a PORT-ot – a szerver a 3000-en
# indult, és a konténer "működött", csak nem válaszolt a várt porton.
ENV PORT=3001
EXPOSE 3001

CMD ["node", ".output/server/index.mjs"]
