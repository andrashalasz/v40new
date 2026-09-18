# Helyi fejlesztői környezet (macOS)

Ez a gép **nem** tartalmaz Homebrew-t, nvm-et vagy helyi MySQL-t, ezért az
alábbi felállás érvényes:

| Komponens | Hol van | Megjegyzés |
|-----------|---------|-----------|
| Node.js 22 LTS | `~/.local/node` | kézzel telepítve, nincs a PATH-ban alapból |
| MySQL 8 | Docker konténer (`mysql_dev`) | `docker-compose.yml`, 3306-os port |
| phpMyAdmin | Docker konténer (`phpmyadmin_dev`) | http://localhost:9090 (root / root) |
| Dev szerver | `npm run dev` | http://localhost:3001 |

## Node a PATH-ba

Minden új terminálban egyszer:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
```

Ha véglegesen kell, tedd a `~/.zshrc` végére ugyanezt a sort.

## Indítás nulláról

```bash
cd ~/Documents/GitHub/v40-vital && export PATH="$HOME/.local/node/bin:$PATH" && docker compose up -d && npm install && npx prisma generate && npx prisma migrate deploy && npm run dev
```

## Adatbázis feltöltése (csak első alkalommal vagy újrakezdéskor)

```bash
npx prisma db seed && npm run content:import
```

A `seed` hozza létre az admin felhasználót a `.env`-ben megadott
`ADMIN_EMAIL` / `ADMIN_PASSWORD` értékekkel, a `content:import` pedig az
`Anyagok/` dokumentumokból tölti fel a szövegeket és kezeléseket.

## Belépés

- Weboldal: http://localhost:3001
- Admin: http://localhost:3001/admin – a `.env`-ben lévő admin adatokkal

## Ellenőrzések

```bash
npm test && npx nuxt typecheck && npm run build
```

## Adatbázis nullázása

```bash
docker compose down -v && docker compose up -d && sleep 20 && npx prisma migrate deploy && npx prisma db seed && npm run content:import
```

## Amihez kulcs kell

Stripe, Számlázz.hu, SMTP, Twilio – ezek nélkül az adott funkció „mock"
(teszt) módban fut, a rendszer egyébként működik. Részletek: `DEPLOY.md`.
