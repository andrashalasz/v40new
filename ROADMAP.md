# Hátralévő munka

Sorrendben, mert az egyes fázisok egymásra épülnek. Minden fázis végén
működőképes, bemutatható állapot van.

---

## 1. Adatbázis élesítés
- [ ] `.env` kitöltése, `prisma migrate dev --name init`
- [ ] `npm run seed` lefuttatása és ellenőrzése
- [ ] Ha van éles adat: átköltöztető szkript (lásd `prisma/migrations_legacy/README.md`)

## 2. Admin CRUD
- [ ] Szakemberek: lista, felvétel, szerkesztés, archiválás, fotó feltöltés
- [ ] Kezelések: ár, áfa, hossz, pufferek, előjegyzési idő, szoba-hozzárendelés
- [ ] Kezelés-típusok: ikon, rövid leírás, felugró ablak bekezdései
- [ ] Szobák: felvétel, archiválás
- [ ] Bérletek: alkalomszám, érvényesség, mely kezelésekre érvényes
- [ ] Beosztás: rendelő nyitvatartása, orvosonkénti rendelési idő, szabadság
- [ ] Foglalási szabályok: raszter, zárolás, lemondási határ, emlékeztető

A tervezett felület a `docs/prototipus-admin-beosztas.html`-ben látható.

## 3. Szerkeszthető szövegek
- [ ] `GET /api/content` – az oldal betöltésekor egyben, gyorsítótárazva
- [ ] Admin szerkesztő oldal/szekció szerint csoportosítva
- [ ] A komponensekben `t('home.hero.title')` hívás kódbeli alapértelmezéssel
      (így egy üres blokk nem tud üres oldalt eredményezni)

## 4. Foglalási folyamat backend
- [ ] `GET /api/availability` – a `server/booking/availability.ts` fölé
- [ ] `POST /api/appointments/hold` – tranzakcióban, `SELECT ... FOR UPDATE`,
      `slotLock` beírásával
- [ ] Szoba-kapacitás beépítése a motorba (metszet + szabad szoba keresés)
- [ ] Lemondás: `slotLock` NULL-ra, bérlet-alkalom visszaírás
- [ ] Cron: lejárt `HOLD` felszabadítása

## 5. Ügyfélfiók
- [ ] Regisztráció + e-mail megerősítés
- [ ] Jelszó nélküli belépés (`LoginToken`) – a foglalás ezt hozza létre
- [ ] Jelszavas belépés és jelszó-visszaállítás
- [ ] Foglalásaim, bérleteim, lemondás, áttétel

## 6. Fizetés
- [ ] Provider-interfész + `MockProvider` (fizetés nélkül végigtesztelhető)
- [ ] Barion: fizetés indítása, visszatérési oldalak
- [ ] Callback feldolgozás: **nem a callback tartalmában bízunk**, hanem
      `GetPaymentState`-tel visszakérdezünk
- [ ] Idempotencia `PaymentEvent`-tel, minden webhook nyersen naplózva
- [ ] Cron: fizetés-egyeztetés (elveszett callback pótlása)
- [ ] Bérletvásárlás ugyanezen a folyamaton

## 7. Számlázás
- [ ] Billingo vagy Számlázz.hu integráció
- [ ] Áfamentes (TAM) és 27%-os tételek helyes kezelése
- [ ] Sztornó visszatérítésnél

## 8. Értesítések
- [ ] Foglalás visszaigazolása, lemondás, áttétel
- [ ] Emlékeztető cron-ból (`reminderHoursBefore`)
- [ ] Bérlet lejárati figyelmeztetés

## 9. SEO
- [ ] `SeoMeta` bekötése, canonical, OG képek
- [ ] Dinamikus `sitemap.xml`
- [ ] JSON-LD: `MedicalClinic`, `FAQPage`, kezelésekre `MedicalProcedure`
- [ ] 301-átirányítások a `Redirect` táblából (slug-változáskor)
- [ ] `robots.txt` felülvizsgálata

## 10. Marketing
- [ ] Sütibanner, kategóriánkénti hozzájárulással
- [ ] GA4 / GTM / Meta Pixel **csak hozzájárulás után**
- [ ] Kezelés-szintű azonosító NEM kerülhet esemény-paraméterbe (GDPR 9. cikk)
- [ ] Hírlevél dupla opt-innel

## 11. Jogi szövegek
- [ ] ÁSZF kiegészítése: bérlet érvényesség, fel nem használt alkalmak,
      elállási jog előre fizetett szolgáltatáscsomagnál
- [ ] Adatkezelési tájékoztató: fizetési szolgáltató, számlázó, analitika
- [ ] A GYIK és az ÁSZF fizetési szakaszának összhangba hozása

## 12. Üzemeltetés
- [ ] Prisma `binaryTargets` cPanelhez (`rhel-openssl-3.0.x`)
- [ ] `entry.cjs` a Passenger/LiteSpeed indításhoz
- [ ] Build CI-ban, csak a `.output/` kerül fel
- [ ] Feltöltött képek deploy-független könyvtárba
- [ ] Adatbázis-mentés
- [ ] Képoptimalizálás (`npm run optimize:images`)

---

## Nyitott kérdések

1. Válasszon-e az ügyfél konkrét orvost, vagy csak kezelést, és a rendelő oszt be?
2. A szabadság felvitele a beosztás-képernyőre kerüljön, vagy külön?
3. Melyik számlázó van már használatban a rendelőben?
4. Egy kezelés egyszerre egy szobát foglal, vagy van olyan, amihez több kell?
