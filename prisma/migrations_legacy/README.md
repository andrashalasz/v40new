# Régi migrációk

Ezek a migrációk a séma átalakítása ELŐTTI adatmodellhez tartoznak
(User / Blog / Product / Doctor, összesen 4 tábla).

A `prisma/schema.prisma` mostantól 32 modellt tartalmaz (foglalás, fizetés,
bérlet, szerkeszthető tartalom, SEO), ezért ezek a migrációk nem folytathatók.

## Mit kell tenni

**Ha még nincs éles adatbázis** – ez a mappa törölhető, és egy friss baseline
migráció készül:

```bash
npx prisma migrate dev --name init
```

**Ha VAN éles adat** – ne fuss neki migrate dev-vel, mert adatot veszíthetsz.
A menet ilyenkor:

1. Mentés az éles adatbázisról (`mysqldump`).
2. Új, üres adatbázis a friss sémával.
3. Adatátköltöztető szkript: Product -> Service, Doctor -> Practitioner,
   Blog -> Blog (a `createdAt` mostantól `@default(now())`).
4. Csak sikeres ellenőrzés után átállás.

Az átköltöztető szkriptet érdemes külön megírni, mert a Product.price
áfa-kezelés nélküli bruttó érték volt, a Service pedig `vatRate` + 
`vatExemptReason` mezőket is használ – ezt tételesen el kell dönteni.
