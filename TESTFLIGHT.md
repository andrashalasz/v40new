# Kipróbálás a saját egészségügyi adataiddal (iOS + Android)

Két út van. A **helyi Docker** a gyorsabb (nem kell szervert frissíteni), a
**teszt aldomén** a kényelmesebb (bárhonnan működik, nem csak otthoni wifin).

Amit én nem tudok megtenni helyetted: nincs SSH-m a szerverhez, és az
Apple-jelszavadat nem írhatom be sehova. Minden más kész.

---

## A) Helyi Docker (ez fut most)

A teljes rendszer egy paranccsal indul:

```bash
cd ~/Documents/GitHub/v40-vital && docker compose up -d --build
```

Ez három konténert indít: MySQL, phpMyAdmin (http://localhost:9090) és az
alkalmazás a **3001**-es porton, a gép minden hálózati címén.

**Első alkalommal** az adatbázis feltöltése:

```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed
docker compose exec app npm run content:import
```

**A gép LAN-címe** – ezt hívja majd a telefon:

```bash
ipconfig getifaddr en0
```

Ellenőrzés a saját géprődől (a `<IP>` helyére a fenti cím):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://<IP>:3001/api/mobile/health/catalog
```

`200`-at kell adnia. Ha nem: a Mac tűzfala blokkolja – Rendszerbeállítások →
Hálózat → Tűzfal.

### Amit tudni kell erről az útról

- A telefonnak és a Macnek **ugyanazon a wifin** kell lennie.
- A Macnek **futnia kell** (nem alvó állapotban), a Dockerrel együtt.
- A LAN-cím DHCP-vel **változhat**. Emiatt nem kell új build: az appban a
  **Belépés** képernyő alján át tudod írni a kiszolgáló címét.

---

## B) Teszt aldomén (v40.orc.hu)

A `v40.orc.hu` jelenleg egy **augusztusi** verziót futtat – nincsenek rajta a
mobil végpontok, így az app be sem tudna lépni. SSH-val, a projekt
könyvtárában:

```bash
git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 restart v40 --update-env
```

(systemd esetén: `sudo systemctl restart v40`)

Ellenőrzés:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://v40.orc.hu/api/mobile/health/catalog   # 200 kell
```

Ha ezt választod, az appban a kiszolgáló címét `https://v40.orc.hu`-ra állítsd.

---

## iOS – TestFlight

A `mobile/` könyvtárban. A `PATH`-ot minden új terminálban be kell állítani,
mert a Node nincs a rendszerútvonalon:

```bash
cd ~/Documents/GitHub/v40-vital/mobile && export PATH="$HOME/.local/node/bin:$PATH"
```

```bash
npx eas-cli login
npx eas-cli build --platform ios --profile testflight
npx eas-cli submit --platform ios --latest
```

Az első futáskor az EAS bekéri az Apple-fiókodat, és **maga létrehozza** az App
ID-t a `hu.v40vital.app` azonosítóhoz, ráteszi a **HealthKit capability**-t, és
elintézi az aláírást. Engedd neki. Az Apple-jelszót itt te írod be – ezt a
lépést nekem nem szabad elvégeznem.

**Időigény:** build 15–20 perc (az EAS szerverein fut), utána az App Store
Connect feldolgozása 10–30 perc. Belső tesztelőként magadat azonnal
hozzáadhatod, **Apple-review nélkül**.

---

## Android – APK átnézésre

Nem kell Play Console, nem kell review:

```bash
npx eas-cli build --platform android --profile android-apk
```

A végén kapsz egy linket és egy QR-kódot; a telefonról megnyitva letölti és
telepíti az APK-t. (Androidon engedélyezni kell az „ismeretlen forrásból"
telepítést.) **Időigény: 10–15 perc.**

**Androidon az egészségügyi rész is működik**, a **Health Connecten** keresztül.
Oda ír a Samsung Health, a Google Fit, a Whoop, az Oura és a Garmin is – külön
Samsung-integráció nem kell.

A Health Connect Android 14-től a rendszer része; korábbi verziókon a Play
Áruházból telepítendő. Ha hiányzik, az app kiírja és odairányít.

---

## Az első kipróbálás a telefonon

1. Telepítés (TestFlight vagy APK).
2. **Belépés** – ha helyi Dockerrel tesztelsz, előbb a képernyő alján állítsd
   be a kiszolgáló címét (`http://<LAN-IP>:3001`), majd lépj be.
3. **Egészség** fül → kapcsold be a négy adatkört. Ez a *mi* hozzájárulásunk,
   még nem az Apple-é.
4. **Adatok szinkronizálása** → ekkor jön fel a rendszer engedélykérője
   (iOS: Apple Health, Android: Health Connect). A lista tetején van egy
   **„Bekapcsolás mind"** kapcsoló – érdemes azt használni, mert amit itt
   kihagysz, arra nem lesz adat, és utólag csak a rendszerbeállításokban
   kapcsolható vissza.
5. A szinkron az elmúlt **egy évet** tölti fel, naponta összesítve. A végén
   kiírja, mely mérésekhez nem talált adatot.

## Az adat megnézése orvosi nézetben

Böngészőben a **/admin** → belépés → **Ügyfelek** → a saját sorodnál
**„Egészségügyi adatok"**. (Helyi Dockernél: http://localhost:3001/admin)

---

## Amire számíts

**Honnan jön az adat:** a Whoop, az Oura, a Garmin, az Apple Watch és a Samsung
Health is a rendszer egészségügyi adattárába ír (iOS: Apple Health, Android:
Health Connect) – mindegyik automatikusan bekerül, külön integráció nélkül.

Ha **több eszköz** is rögzíti ugyanazt az éjszakát, az alvásidő nem duplázódik:
a lefedett időt mérjük, nem a szakaszok összegét.

**Óra vagy gyűrű nélkül** a pulzus, a HRV és az alvás üres marad. Telefonnal
biztosan van lépésszám, távolság és állási idő, plusz amit kézzel vagy
okosmérleggel rögzítettél (testsúly, BMI, testzsír).

**A szimulátor/emulátor nem jó erre**: ott az adattár üres.

**Egy különbség a két platform között:** a Health Connect kevesebb mérést tud
natívan napi bontásban összesíteni, mint az Apple Health. A HRV-t, a VO₂max-ot,
a testzsírt és az izomtömeget ezért Androidon nyers rekordokból számoljuk – az
eredmény ugyanaz, csak a mögöttes út más.

## Ha valami nem működik

| Tünet | Ok |
|---|---|
| „Nincs kapcsolat a szerverrel" | Rossz kiszolgáló-cím, más wifi, vagy a Mac tűzfala blokkol |
| „Érvénytelen e-mail vagy jelszó" | A fiók abban az adatbázisban kell legyen, amelyikhez az app kapcsolódik |
| A szinkron 0 értéket tölt fel | Az Apple Health engedélykérésnél nem lett bekapcsolva semmi – Beállítások → Adatvédelem és biztonság → Egészség → V40 Vital |
| Minden üres az orvosi nézetben | Más fiókkal léptél be az appban, mint amit az adminban nézel |
| Hihetetlenül sok alvásóra | Szólj – ez több forrás összeadódását jelentené, amit épp javítottunk |
