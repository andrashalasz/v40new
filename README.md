# V40 Vital

Longevity klinika weboldala időpontfoglalással, bankkártyás fizetéssel és
bérletkezeléssel. Nuxt 4 + Prisma + MySQL.

---

## Állapot

Ez a repó egy **átalakítás alatt lévő** projekt. Az arculat és a Vue komponensek
a korábbi verzióból származnak és megmaradnak; a backend és az adatmodell újra
lett tervezve, hogy elbírja a foglalást, a fizetést és a bérletet.

| Rész | Állapot |
|---|---|
| Arculat, komponensek, nyitóoldal | kész (korábbi verzióból) |
| Adatmodell (32 modell) | kész, validált |
| Foglalási motor (szabad idősávok) | kész, 20 teszt, időzóna-független |
| Seed adatok | kész |
| Admin CRUD (szakember, kezelés, szoba, bérlet) | **hátravan** |
| Szerkeszthető szövegek admin felülete | **hátravan** |
| Ügyfél belépés / regisztráció | **hátravan** |
| Barion integráció | **hátravan** |
| Számlázás | **hátravan** |
| SEO (sitemap, JSON-LD, átirányítások) | **hátravan** |

A `docs/` mappában két kattintható prototípus van, amiken a tervezett működés
végigpróbálható adatbázis és fizetési szolgáltató nélkül:

- `docs/prototipus-oldal.html` – teljes publikus oldal, foglalási folyamat,
  bérletvásárlás, szimulált Barion-fizetés
- `docs/prototipus-admin-beosztas.html` – beosztás és foglalási szabályok,
  élő idősáv-előnézettel

Mindkettő önálló HTML, a képek beágyazva. Elég duplán rákattintani.

---

## Indítás

Előfeltétel: Node 22+, MySQL 8 (vagy MariaDB 10.6+).

```bash
cp .env.example .env          # majd tölts ki minden üres értéket
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed                  # ADMIN_EMAIL / ADMIN_PASSWORD kell hozzá
npm run dev                   # http://localhost:3001
```

Munkamenet-kulcs generálása:

```bash
openssl rand -base64 32
```

### Tesztek

```bash
npm test
```

A foglalási motor tiszta függvény, adatbázis nélkül fut. A CI ugyanezt
lefuttatja öt különböző szerver-időzónában is, mert a rendszer időzónája nem
befolyásolhatja a naptárat.

---

## Fontos tudnivalók

### Az adatbázis-migráció nem folytatható a régiről

A `prisma/migrations_legacy/` a korábbi, 4 táblás modellhez tartozik. Ha van
éles adat, **ne** futtass `migrate dev`-et – a mappa README-je leírja a
biztonságos átköltöztetés menetét.

### Áfa

A magán egészségügyi szolgáltatás áfamentes (Áfa tv. 85. §), az esztétikai
jellegű kezelés viszont jellemzően 27%-os. Ezért az áfakulcs **kezelés-szintű**
(`Service.vatRate` + `vatExemptReason`), nem globális beállítás.

### Törlés helyett archiválás

Kezelést, szakembert vagy szobát, amelyre korábbi foglalás vagy számla
hivatkozik, nem lehet valóban törölni – az előzmény elszakadna. Ezért van
`archivedAt` mező: a felhasználó számára eltűnik, a történet megmarad.

### Marketing és GDPR

Ha egy hirdetési pixel azt jelzi, hogy valaki az „Anyajegy vizsgálat" oldalt
nézte, az egészségügyi adatra vonatkozó következtetés (GDPR 9. cikk).
A pixelek ezért csak hozzájárulás után tölthetnek be (`ClinicSettings`,
`ConsentLog`), és az esemény-paraméterekbe nem kerülhet bele, hogy melyik
kezelést nézte a látogató.

### Képek

A `public/` mappa ~24 MB. A `favicon.svg` egyedül 2,2 MB, ami minden
oldalletöltéssel letöltődik. Mérés szerint WebP-vel ~95% megtakarítható:

```bash
npm i -D sharp
npm run optimize:images
```

---

## Mi lett javítva a korábbi kódban

- `sharp` átméretezés érvénytelen opciókulccsal (`server/api/blogs.ts`, `products.ts`)
- feltöltött képek URL-je hardkódolt éles domainre mutatott – most relatív
- `Product.price` NaN esetén üres stringet adott egy `Int` mezőnek
- `login.ts` saját `PrismaClient` példányt nyitott a megosztott helyett
- `bcrypt.compare` nullable jelszóval elhasalhatott
- 6 admin oldalról hiányzott a `middleware: ["admin"]`
- `Dockerfile`: hibás `CMD` szintaxis, és dev mód éles képben; `EXPOSE` port
- `package.json` `test` scriptje nem létező vitest-et hívott
- a seed a repóba égette be az admin jelszót – most környezeti változóból jön
- `Blog.createdAt` nem volt `@default(now())`, ezért a mentés hibára futott

## Struktúra

```
app/                 Vue komponensek, oldalak (arculat – változatlan)
server/api/          meglévő endpointok (blog, termék, orvos, login)
server/booking/      foglalási motor + tesztek
prisma/schema.prisma adatmodell (32 modell)
prisma/seed.ts       kezdőadatok
scripts/             képoptimalizáló
docs/                kattintható prototípusok
ROADMAP.md           a hátralévő munka sorrendben
```
