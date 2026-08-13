FROM node:20-alpine

# Szükséges függőségek a Prismához és a buildhez
RUN apk add --no-cache libc6-compat openssl openssl-dev

WORKDIR /app

COPY package*.json ./
# Prisma séma másolása az install előtt, hogy a postinstall script lefusson (ha van)
COPY prisma ./prisma/

RUN npm install

COPY . .

# Fontos: Prisma kliens generálása a konténeren belül
RUN npx prisma generate

# Építés (Nuxt build)
RUN npm run build

EXPOSE 3000

# Ha dev módban akarod futtatni Dockerben (hot reload-dal), akkor maradjon a dev.
# Ha élesre szánod, akkor: CMD ["node", ".output/server/index.mjs"]
CMD ["npm", "run dev"]