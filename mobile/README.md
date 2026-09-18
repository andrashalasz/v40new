# V40 Vital – mobilalkalmazás (iOS + Android)

React Native + Expo (SDK 57). **Egy kódbázis, két platform.** A választás oka,
hogy a backend is TypeScript: a típusok és a validáció megoszthatók, így nem
kell ugyanazt a logikát kétszer (Swift + Kotlin) megírni és kétszer karbantartani.

Az app a **meglévő webes API-kat** használja – nincs külön „mobil backend",
amelyik idővel elcsúszna a weboldaltól.

---

## Indítás

A backendnek futnia kell (lásd a gyökér `FEJLESZTES.md`-jét).

```bash
cd mobile && export PATH="$HOME/.local/node/bin:$PATH" && npx expo start
```

Ezután `i` = iOS szimulátor, `a` = Android emulátor, vagy QR-kód beolvasása
Expo Go alkalmazással valódi telefonon.

### Fontos: a backend címe

Szimulátorból és telefonról a `localhost` **nem** a Mac-et jelenti. Az
`app.json` → `extra.apiBaseUrl` mezőbe a gép LAN-címét kell írni:

```bash
ipconfig getifaddr en0     # pl. 192.168.1.42
```

```json
"extra": { "apiBaseUrl": "http://192.168.1.42:3001" }
```

Élesben ide a publikus HTTPS-domain kerül.

---

## Felépítés

```
app/                      képernyők (expo-router: a fájl útvonala = az URL)
  _layout.tsx             gyökér: szolgáltatók, navigáció
  belepes.tsx             belépés (modális)
  (tabs)/                 alsó fülsáv
    index.tsx             kezelések + kategória-szűrő
    berletek.tsx          saját bérletek + megvásárolható csomagok
    foglalasaim.tsx       közelgő és korábbi foglalások
    fiok.tsx              profil, szakvélemények, dokumentumok, számlák
  foglalas/[slug].tsx     foglalási folyamat
src/
  api/client.ts           minden hálózati hívás; token-frissítés, hibakezelés
  api/tokens.ts           token-tárolás Keychain / Keystore-ban
  api/types.ts            a backend válaszainak típusai
  auth/AuthContext.tsx    bejelentkezési állapot
  ui/                     közös elemek (gomb, kártya, mező…)
  theme.ts                színek, méretek, formázók
```

### Két szabály, amit érdemes tartani

1. **Ne hívj nyers `fetch`-et.** Mindig az `api()` függvényt használd
   (`src/api/client.ts`): az teszi rá a tokent, frissíti ha lejárt, és vonja
   össze a párhuzamos frissítéseket. Enélkül a felhasználót 15 percenként
   kiléptetné a rendszer – vagy rosszabb: a versengő frissítéseket a szerver
   token-lopásnak minősítené, és minden eszközéről kijelentkeztetné.

2. **Új végpont válaszához írj típust** a `src/api/types.ts`-be. Így ha a
   backend megváltozik, a `npm run typecheck` megmutatja, hol kell követni.

---

## Nyelvek

Az app a **telefon nyelvét** veszi át. Ha az nem támogatott, **angol** lesz –
nem magyar: egy külföldi vendégnek az angol legalább eséllyel érthető.

| Honnan jön a szöveg | Hol szerkeszthető |
|---|---|
| Felület (gombok, címkék, hibák) | `src/i18n/strings.ts` (hu), `en.ts`, `de.ts` |
| Kezelésnevek, leírások, bérletek | admin → Fordítások |

A magyar tábla a teljes lista, a típus abból származik – egy hiányzó kulcs
**fordítási hiba** lesz a `npm run typecheck`-ben, nem futásidejű meglepetés.

A nyelvkódot nem kell hívásonként odaírni: az `api()` kliens minden
lekérdezéshez hozzáteszi (`setApiLocale`). A szerver visszaesési lánca
**kért nyelv → angol → magyar**, lásd `server/utils/i18n.ts`.

Dátumot és árat mindig a `useFormat()` hookkal formázz – az a nyelvhez köti az
alakot, az időzónát viszont fixen `Europe/Budapest`-en tartja. A rendelő
Budapesten van: egy külföldön tartózkodó vendégnek is a budapesti 10:00-t kell
látnia, nem a saját készüléke szerinti időt.

**Ismert hiányosság:** a szerver hibaüzenetei (`statusMessage`) egyelőre csak
magyarul léteznek. A belépés és a foglalás hibáinál ezért idegen nyelven az app
saját, fordított üzenetét mutatja; magyarul a szerverét, mert az pontosabb.

## Ikonok

A `scripts/make-app-icons.mjs` (a repó gyökerében) a **weboldal logójából**
állítja elő az ikonkészletet: a `public/logo2.png` "V40" részét vágja ki, és a
márka sötétzöld hátterére teszi. Ha a logó változik, elég újrafuttatni:

```bash
node scripts/make-app-icons.mjs
```

A teljes "V40Vital Longevity" felirat azért nem használható app-ikonként, mert
széles: 60×60 képponton a betűk olvashatatlanná válnának.

## Hitelesítés

A weboldal sütis munkamenetet használ, ami natív appból nem járható. Az app
ezért token-párt kap (`/api/mobile/auth/login`):

| Token | Élettartam | Hol tároljuk | Mire jó |
|---|---|---|---|
| hozzáférési | 15 perc | memória + Keychain | minden kérés fejlécében |
| frissítő | 60 nap | Keychain | az előbbi cseréjéhez |

A frissítő token **minden használatkor cserélődik**. Ha egy már felhasznált
tokennel érkezik kérés, az lopott tokenre utal, ezért a szerver a felhasználó
**összes eszközét** kijelentkezteti. Ez szándékos: inkább kelljen újra belépni,
mint hogy egy ellopott token hónapokig éljen.

A szerveroldali rész: `server/utils/mobile-auth.ts`, `server/utils/token-sign.ts`,
tesztek: `tests/auth/token-sign.test.ts`.

---

## Ellenőrzés

```bash
npm run typecheck
```

Teljes fordítás szimulátor nélkül (kimutatja az összes import- és
szintaxishibát):

```bash
npx expo export --platform ios --output-dir /tmp/v40-export
```

---

## Ami még nincs kész

- **Bérletvásárlás az appban** – a fizetési modul (Stripe) beépítése hátravan.
- **Push értesítések** – a csomag telepítve van, a bekötés hátravan.
- **Egészségügyi adatok** (Apple Health / Health Connect) – 2. fázis.
- **Ikonok és indítókép** – jelenleg az Expo alapértelmezettjei.
- **Három nyelv** – az app most magyar; a backend fordításai már megvannak.
