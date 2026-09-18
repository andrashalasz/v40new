# TestFlight – első kipróbálás a saját Apple Health adataiddal

Két dolgot kell elvégezni, ebben a sorrendben:

1. a **backend** frissítése a teszt aldoménen (`v40.orc.hu`),
2. az **app** buildelése és feltöltése a TestFlightba.

Amit én nem tudok megtenni helyetted: nincs SSH-hozzáférésem a szerverhez, és
az Apple-jelszavadat nem írhatom be sehova. Ezek a parancsok viszont pontosan
azok, amikre szükség van.

---

## 1. Backend a v40.orc.hu-n

A teszt aldomén jelenleg egy **augusztusi** verziót futtat: van rajta
`/api/languages`, de a mobil végpontok (`/api/mobile/...`) még hiányoznak.
Enélkül az app be sem tud lépni.

SSH-val a szerveren, a projekt könyvtárában:

```bash
git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 restart v40 --update-env
```

A `migrate deploy` két új migrációt visz fel: a mobil munkameneteket
(`mobile_sessions`) és az egészségügyi adatokat (`health_data`). Adatot nem
töröl, meglévő oszlopot nem ír át.

> Ha a szerveren nem `pm2`, hanem systemd fut:
> `sudo systemctl restart v40`

**Ellenőrzés** – ennek a három sornak kell jönnie:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://v40.orc.hu/api/mobile/health/catalog   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://v40.orc.hu/api/products                # 200
curl -s -o /dev/null -w "%{http_code}\n" https://v40.orc.hu/api/mobile/auth/login       # 405 vagy 400
```

A `catalog` végpont 404-et ad, ha a build nem frissült.

**Kell egy felhasználó**, akivel az appból belépsz. Ha a teszt adatbázisban már
van admin fiókod, az jó. Ha nem:

```bash
npx prisma db seed     # a .env-ben lévő ADMIN_EMAIL / ADMIN_PASSWORD alapján
```

---

## 2. App a TestFlightba

A gépeden, a `mobile/` könyvtárban. A `PATH`-ot minden új terminálban be kell
állítani, mert a Node nincs a rendszerútvonalon:

```bash
cd ~/Documents/GitHub/v40-vital/mobile && export PATH="$HOME/.local/node/bin:$PATH"
```

### 2.1 Bejelentkezés

```bash
npx eas-cli login
```

(Expo-fiók kell hozzá; ha nincs, az `eas login` felkínálja a regisztrációt.)

### 2.2 Build

```bash
npx eas-cli build --platform ios --profile testflight
```

Az első futáskor az EAS bekéri az Apple-fiókodat, és **maga létrehozza**:

- az App ID-t a `hu.v40vital.app` azonosítóhoz,
- a **HealthKit capability**-t rajta,
- az aláíró tanúsítványt és a provisioning profilt.

Engedd neki (`Yes` a kérdésekre). Az Apple-jelszót itt te írod be – ezt a
lépést nekem nem szabad elvégeznem.

> Ha kétlépcsős azonosítás van a fiókodon, egy kódot is be kell írni.
> Alternatíva CI-hez: App Store Connect API kulcs, de egy kézi buildhez
> felesleges.

A build az EAS szerverein fut, kb. 10–20 perc.

### 2.3 Feltöltés TestFlightba

```bash
npx eas-cli submit --platform ios --latest
```

Ezután az App Store Connectben a build „Processing" állapotba kerül (10–30
perc), majd megjelenik a TestFlightban. **Belső tesztelőként** magadat azonnal
hozzáadhatod – ehhez nem kell Apple-review.

> Az első feltöltés előtt az App Store Connectben létre kell hoznia egy app
> rekordot. Az `eas submit` ezt felajánlja; ha inkább kézzel tennéd, az
> azonosító `hu.v40vital.app`, a név `V40 Vital`.

---

## 3. Az első kipróbálás a telefonon

1. TestFlight → **V40 Vital** telepítése.
2. Az appban **Fiókom → Belépés**, a v40.orc.hu-s fiókoddal.
3. **Egészség** fül: kapcsold be a négy adatkört (alvás, mozgás, szív,
   testösszetétel). Ez a *mi* hozzájárulásunk, még nem az Apple-é.
4. **Adatok szinkronizálása** → ekkor jön fel az **Apple Health engedélykérő
   képernyője**. Itt van a buktató: a lista tetején van egy
   **„Bekapcsolás mind"** kapcsoló – érdemes azt használni, mert ha egyesével
   hagysz ki mérést, arra egyszerűen nem lesz adat.
5. A szinkron az elmúlt **egy évet** tölti fel, naponta összesítve. Néhány
   másodperc; a képernyő kiírja, hol tart.
6. A végén megmutatja, **mely mérésekhez nem talált adatot**.

## 4. Az adat megnézése orvosi nézetben

Böngészőben: **https://v40.orc.hu/admin** → belépés → **Ügyfelek** → a saját
sorodnál **„Egészségügyi adatok"**.

Ott találod az időszak-szűrőt, a trendeket és a kezelés előtti/utáni
összehasonlítást.

---

## Amire számíts

**Apple Watch nélkül** a pulzus, a HRV és az alvás nagy eséllyel üres marad –
ezeket az óra rögzíti. Telefonnal biztosan van: **lépésszám, távolság,
állással töltött idő**, és amit kézzel vagy okosmérleggel rögzítettél
(**testsúly, BMI, testzsír**).

**A szimulátor nem jó erre.** Az iOS szimulátorban a Health adattár üres, és a
HealthKit engedélykérés sem működik úgy, mint valódi készüléken. Ezért megy
TestFlightba.

**A backend címe bele van égetve a buildbe.** Ha később másik szerverre
mutatna, az `app.json` → `extra.apiBaseUrl` átírása után **új build kell**.

## Ha valami nem működik

| Tünet | Ok |
|---|---|
| Belépéskor „Nincs kapcsolat a szerverrel" | A backend nem frissült – nézd meg a `catalog` végpontot (1. pont) |
| „Érvénytelen e-mail vagy jelszó" | A fiók a *teszt* adatbázisban kell hogy legyen, nem az élesben |
| A szinkron 0 feltöltött értéket ad | Az Apple Health engedélykérésnél nem lett bekapcsolva semmi – Beállítások → Adatvédelem → Egészség → V40 Vital |
| Minden üres az orvosi nézetben | Más fiókkal léptél be az appban, mint amit az adminban nézel |
